'use client';

import { useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Copy, Download, Check, BarChart3 } from 'lucide-react';

interface VisualizationFrameProps {
  html: string;
  title?: string;
}

export function VisualizationFrame({ html, title }: VisualizationFrameProps) {
  const [height, setHeight] = useState(320);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  // Listen for postMessage height updates from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'resize' && typeof e.data.height === 'number') {
        setHeight(Math.min(Math.max(e.data.height + 20, 200), 800));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isDark = theme === 'dark';

  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      /* Claude-style CSS variables — auto-adapt to dark/light mode */
      --color-text-primary: ${isDark ? '#e8e8e6' : '#1a1a1a'};
      --color-text-secondary: ${isDark ? '#9b9b95' : '#6b6b6b'};
      --color-text-tertiary: ${isDark ? '#6b6b65' : '#999999'};
      --color-background-primary: ${isDark ? '#2a2a28' : '#ffffff'};
      --color-background-secondary: ${isDark ? '#353533' : '#f5f5f4'};
      --color-background-tertiary: ${isDark ? '#404040' : '#ebebeb'};
      --color-border-primary: ${isDark ? '#4a4a45' : '#e0e0de'};
      --color-border-secondary: ${isDark ? '#3d3d3a' : '#ebebeb'};
      --color-border-tertiary: ${isDark ? '#333330' : '#f0f0ef'};
      --color-accent: ${isDark ? '#89b4fa' : '#1e66f5'};
      --border-radius-sm: 4px;
      --border-radius-md: 8px;
      --border-radius-lg: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      overflow: hidden;
      padding: 16px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4 { color: var(--color-text-primary); font-weight: 500; }
    h2 { font-size: 16px; margin: 0 0 1rem; }
    h3 { font-size: 14px; margin: 0 0 0.75rem; }
    p { color: var(--color-text-primary); }
    canvas { max-width: 100%; }
    svg { max-width: 100%; height: auto; }
    input[type="range"] {
      width: 100%;
      accent-color: var(--color-accent);
    }
    /* Common utility classes the AI can use */
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
  </style>
</head>
<body>
  ${html}
  <script>
    const observer = new ResizeObserver(() => {
      parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
    });
    observer.observe(document.body);
    requestAnimationFrame(() => {
      parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
    });
  </script>
</body>
</html>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([wrappedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'visualization').replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground/80 truncate">
            {title || 'Visualization'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={wrappedHtml}
        title={title ?? 'Visualization'}
        height={height}
        style={{ width: '100%', border: 'none', display: 'block' }}
        sandbox="allow-scripts"
      />
    </div>
  );
}

/**
 * Skeleton placeholder shown while a visualization is being streamed.
 * Displays a pulsing loading state with the title.
 */
export function VisualizationSkeleton({ title }: { title: string }) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-medium text-foreground/80">{title || 'Visualization'}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" />
          <span>Generating...</span>
        </div>
      </div>

      {/* Skeleton content */}
      <div className="p-6 space-y-4 animate-pulse">
        {/* Chart skeleton */}
        <div className="flex items-end gap-2 h-40 px-4">
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '60%' }} />
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '85%' }} />
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '45%' }} />
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '70%' }} />
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '90%' }} />
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '55%' }} />
          <div className="flex-1 bg-muted/60 rounded-t-md" style={{ height: '75%' }} />
        </div>
        {/* Axis skeleton */}
        <div className="h-px bg-muted/60 mx-4" />
        <div className="flex justify-between px-4">
          <div className="h-3 w-8 bg-muted/40 rounded" />
          <div className="h-3 w-8 bg-muted/40 rounded" />
          <div className="h-3 w-8 bg-muted/40 rounded" />
          <div className="h-3 w-8 bg-muted/40 rounded" />
        </div>
      </div>
    </div>
  );
}
