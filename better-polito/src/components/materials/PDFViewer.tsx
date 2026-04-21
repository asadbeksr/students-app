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
  const [pageInput, setPageInput] = useState('');
  const updateCourseState = useCoursePortalStore(s => s.updateCourseState);
  const previewPage = useCoursePortalStore(s => s.getCourseState(courseId).previewPage);

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
          setPageInput(String(page));
        }
      }
    };
    window.addEventListener('pdf-navigate', handlePdfNavigate as EventListener);
    return () => window.removeEventListener('pdf-navigate', handlePdfNavigate as EventListener);
  }, [courseId, updateCourseState]);

  // Sync pageInput with stored previewPage (e.g. on mount)
  useEffect(() => {
    setPageInput(previewPage ? String(previewPage) : '');
  }, [previewPage]);

  useEffect(() => {
    setPdfHash(''); // Reset hash when new document loads
    setPageInput('');
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
          <span className="text-xs text-muted-foreground whitespace-nowrap">AI page:</span>
          <input
            type="number"
            min={1}
            placeholder="–"
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onBlur={() => {
              const n = parseInt(pageInput, 10);
              updateCourseState(courseId, { previewPage: Number.isFinite(n) && n > 0 ? n : null });
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-14 h-7 text-xs text-center rounded border border-border bg-background px-1 focus:outline-none focus:ring-1 focus:ring-primary"
            title="Tell the AI which page you're reading"
          />
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
