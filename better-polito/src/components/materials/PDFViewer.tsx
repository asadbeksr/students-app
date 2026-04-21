'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCoursePortalStore } from '@/lib/stores/coursePortalStore';
import type { Material } from '@/types';
import {
  X,
  Download,
  FileText,
  Loader2,
  ExternalLink,
  FileDown,
} from 'lucide-react';

interface PDFViewerProps {
  material?: Material;
  courseId: string;
  onClose?: () => void;
  /** Direct URL for API-served PDFs (proxy URL, auth included server-side) */
  url?: string;
  /** Display name when using url mode */
  name?: string;
}

export default function PDFViewer({
  material,
  courseId,
  onClose,
  url: propUrl,
  name: propName,
}: PDFViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [pdfHash, setPdfHash] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const updateCourseState = useCoursePortalStore(s => s.updateCourseState);

  const displayName = propName ?? material?.name ?? 'Document';
  const { toast } = useToast();

  useEffect(() => {
    const handlePdfNavigate = (e: CustomEvent<string>) => {
      setPdfHash('#' + e.detail);
      // If the AI navigated to a specific page, sync previewPage so future AI context stays accurate
      const pageMatch = e.detail.match(/^page=(\d+)$/);
      if (pageMatch) {
        const page = parseInt(pageMatch[1], 10);
        if (Number.isFinite(page) && page > 0) {
          updateCourseState(courseId, { previewPage: page });
        }
      }
    };
    window.addEventListener('pdf-navigate', handlePdfNavigate as EventListener);
    return () => window.removeEventListener('pdf-navigate', handlePdfNavigate as EventListener);
  }, [courseId, updateCourseState]);

  useEffect(() => {
    setPdfHash(''); // Reset hash when new document loads
    updateCourseState(courseId, { previewPage: null });
    if (!propUrl) {
      const pdfData = material?.fileData || (material as any)?.content;
      if (pdfData instanceof ArrayBuffer) {
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      }
      return;
    }

    let objectUrl: string | null = null;
    setIsFetching(true);
    setBlobUrl(null);

    (async () => {
      try {
        const res = await fetch(propUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        toast({
          title: 'Failed to load PDF',
          description: (err as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    })();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [propUrl, material]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConvert = async () => {
    if (!blobUrl || converting) return;
    setConverting(true);
    try {
      const res = await fetch(blobUrl);
      const buffer = await res.arrayBuffer();

      // Encode as base64 for Gemini
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize)
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      const pdfBase64 = btoa(binary);

      const convertRes = await fetch('/api/ai/convert-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 }),
      });

      if (!convertRes.ok) {
        const err = await convertRes.json().catch(() => ({ error: `HTTP ${convertRes.status}` }));
        throw new Error(err.error || `HTTP ${convertRes.status}`);
      }

      let markdown = await convertRes.text();

      // Replace [FIGURE_PAGE:N] placeholders with rendered page screenshots
      const pagePlaceholders = [...markdown.matchAll(/\[FIGURE_PAGE:(\d+)\]/g)];
      if (pagePlaceholders.length > 0) {
        const uniquePages = [...new Set(pagePlaceholders.map(m => parseInt(m[1], 10)))];
        const pageImages = new Map<number, string>();

        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;

        for (const pageNum of uniquePages) {
          if (pageNum < 1 || pageNum > pdf.numPages) continue;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, canvas, viewport }).promise;
          pageImages.set(pageNum, canvas.toDataURL('image/png').split(',')[1]);
        }

        markdown = markdown.replace(/\[FIGURE_PAGE:(\d+)\]/g, (_, n) => {
          const img = pageImages.get(parseInt(n, 10));
          return img
            ? `![Figure on page ${n}](data:image/png;base64,${img})`
            : `[Figure on page ${n}]`;
        });
      }

      const mdBlob = new Blob([markdown], { type: 'text/markdown' });
      const mdUrl = URL.createObjectURL(mdBlob);
      const a = document.createElement('a');
      a.href = mdUrl;
      a.download = `${displayName.replace(/\.pdf$/i, '')}.md`;
      a.click();
      URL.revokeObjectURL(mdUrl);
    } catch (err) {
      toast({
        title: 'Conversion failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setConverting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
          <p className="font-medium text-foreground">Loading PDF…</p>
          <p className="text-sm text-muted-foreground mt-1">Fetching {displayName}</p>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">No PDF content</p>
          <p className="text-sm mt-1">This file has no attached data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate">{displayName}</h2>
        </div>
        <div className="flex items-center gap-2 mx-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleConvert}
            disabled={converting}
            title="Convert handwriting/PDF to readable Markdown"
            className="h-7 text-xs gap-1.5"
          >
            {converting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            {converting ? 'Converting…' : 'Convert to readable'}
          </Button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" title="Download PDF" asChild>
            <a href={blobUrl} download={`${displayName}.pdf`}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" title="Open in new tab" asChild>
            <a href={blobUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-black/5">
        <iframe
          key={`${blobUrl}${pdfHash}`}
          src={`${blobUrl}${pdfHash}`}
          className="w-full h-full border-0"
          title={displayName}
        />
      </div>
    </div>
  );
}
