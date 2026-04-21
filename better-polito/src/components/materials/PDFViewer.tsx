'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCoursePortalStore } from '@/lib/stores/coursePortalStore';
import { useMaterialStore } from '@/stores/materialStore';
import type { Material } from '@/types';
import {
  X,
  Download,
  FileText,
  Loader2,
  ExternalLink,
  FileDown,
  Save,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const { createMaterial, createFolder, folders, fetchFolders, fetchMaterials } = useMaterialStore();

  const runConvert = async (): Promise<string> => {
    const res = await fetch(blobUrl!);
    const buffer = await res.arrayBuffer();

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
        return img ? `![Figure on page ${n}](data:image/png;base64,${img})` : `[Figure on page ${n}]`;
      });
    }

    return markdown;
  };

  const handleConvert = async () => {
    if (!blobUrl || converting) return;
    setConverting(true);
    try {
      const markdown = await runConvert();
      const mdName = `${displayName.replace(/\.pdf$/i, '')}.md`;

      // Save to My Files (Uploads folder in IndexedDB)
      await fetchFolders(courseId);
      let uploadsFolder = folders.find(f => f.courseId === courseId && f.name === 'Uploads' && f.parentId === null);
      if (!uploadsFolder) {
        uploadsFolder = await createFolder({ courseId, name: 'Uploads', parentId: null });
      }
      await createMaterial({
        courseId,
        folderId: uploadsFolder.id,
        type: 'note',
        name: mdName,
        content: markdown,
        fileSize: new TextEncoder().encode(markdown).length,
      });
      await fetchMaterials(courseId);

      toast({ title: 'Saved to My Files', description: mdName });
    } catch (err) {
      toast({ title: 'Conversion failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setConverting(false);
    }
  };

  const handleConvertDownload = async () => {
    if (!blobUrl || converting) return;
    setConverting(true);
    try {
      const markdown = await runConvert();
      const mdBlob = new Blob([markdown], { type: 'text/markdown' });
      const mdUrl = URL.createObjectURL(mdBlob);
      const a = document.createElement('a');
      a.href = mdUrl;
      a.download = `${displayName.replace(/\.pdf$/i, '')}.md`;
      a.click();
      URL.revokeObjectURL(mdUrl);
    } catch (err) {
      toast({ title: 'Conversion failed', description: (err as Error).message, variant: 'destructive' });
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
          <div className="flex items-center rounded-md border border-border overflow-hidden h-7">
            <button
              onClick={handleConvert}
              disabled={converting}
              title="Convert to Markdown and save to My Files"
              className="flex items-center gap-1.5 px-2.5 text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-50 transition-colors h-full"
            >
              {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {converting ? 'Converting…' : 'Convert to readable'}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button disabled={converting} className="flex items-center justify-center w-6 border-l border-border text-muted-foreground hover:bg-muted/60 disabled:opacity-50 transition-colors h-full">
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleConvert} disabled={converting}>
                  <Save className="h-4 w-4 mr-2" /> Save to My Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleConvertDownload} disabled={converting}>
                  <FileDown className="h-4 w-4 mr-2" /> Download .md
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
