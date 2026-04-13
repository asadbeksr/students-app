'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/stores/chatStore';
import type { Material } from '@/types';
import {
  X,
  MessageCircle,
  Maximize2,
  Minimize2,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const displayName = propName ?? material?.name ?? 'Document';
  const { toast } = useToast();
  const { sendMessage, messages, loading } = useChatStore();

  // Fetch the PDF through the proxy → create a blob URL so <embed> can render it
  useEffect(() => {
    if (!propUrl) {
      // Local ArrayBuffer material
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

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      setSelectedText(text);
      setShowAIChat(true);
      setAiQuestion(`Explain this from the PDF: "${text}"`);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    setIsSending(true);
    try {
      const q = selectedText
        ? `From "${displayName}": ${aiQuestion}\n\nSelected text: "${selectedText}"`
        : `From "${displayName}": ${aiQuestion}`;
      await sendMessage(courseId, q);
      setAiQuestion('');
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const courseMessages = messages.filter((m) => m.courseId === courseId);

  /* ── Loading state ──────────────────────────────────────────────── */
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

  /* ── No data state ──────────────────────────────────────────────── */
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
    <div
      className={`h-full flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            Use browser controls inside the viewer to zoom · rotate · navigate pages
          </p>
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          {/* Download */}
          <Button variant="ghost" size="icon" title="Download PDF" asChild>
            <a href={blobUrl} download={`${displayName}.pdf`}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
          {/* Open in new tab */}
          <Button variant="ghost" size="icon" title="Open in new tab" asChild>
            <a href={blobUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {/* AI Chat */}
          <Button
            variant={showAIChat ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setShowAIChat(!showAIChat)}
            title="AI Chat"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          {/* Fullscreen */}
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF embed — browser native viewer, no pdfjs-dist needed */}
        <div className="flex-1 relative min-w-0" onMouseUp={handleTextSelection}>
          <embed
            src={blobUrl}
            type="application/pdf"
            className="w-full h-full border-0"
          />
        </div>

        {/* AI Chat Panel */}
        {showAIChat && (
          <div className="w-80 xl:w-96 border-l border-border bg-card flex flex-col shrink-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Ask questions about this PDF</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAIChat(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {selectedText && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1">Selected Text:</p>
                    <p className="text-xs text-foreground italic line-clamp-3">"{selectedText}"</p>
                  </div>
                )}

                {courseMessages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Select text from the PDF or type a question below</p>
                  </div>
                )}

                {courseMessages.slice(-8).map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-muted/60 text-foreground ml-4'
                        : 'bg-primary/5 border border-primary/10 text-foreground mr-2'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}

                {(loading || isSending) && (
                  <div className="flex items-center gap-2 text-muted-foreground px-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">AI is thinking…</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask about the PDF…"
                  onKeyDown={(e) => e.key === 'Enter' && !loading && !isSending && handleAskAI()}
                  className="flex-1 text-sm h-9"
                  disabled={loading || isSending}
                />
                <Button
                  onClick={handleAskAI}
                  disabled={loading || isSending || !aiQuestion.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ask'}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {selectedText
                  ? '💡 Selected text will be included as context'
                  : '💡 Tip: select text in the PDF before asking'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
