'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Copy, Download, Check, PlaySquare } from 'lucide-react';

interface ManimFrameProps {
  script: string;
  title?: string;
}

export function ManimFrame({ script, title }: ManimFrameProps) {
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  // Safely encode the user script into the iframe HTML.
  // We Base64-encode it to avoid ANY escaping issues with template literals,
  // backticks, ${}, quotes, etc. inside the user-generated code.
  const wrappedHtml = useMemo(() => {
    const encodedScript = btoa(unescape(encodeURIComponent(script)));

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --color-background-primary: ${isDark ? '#2a2a28' : '#ffffff'};
      --color-text-primary: ${isDark ? '#e8e8e6' : '#1a1a1a'};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      overflow: hidden;
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100vh;
      margin: 0;
    }
    #manim-container {
      width: 100%;
      height: 100%;
    }
    #manim-container canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    #error-box {
      display: none;
      color: #ff5555;
      padding: 1rem;
      border: 1px solid #ff5555;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
    }
    #loading-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--color-text-primary);
      opacity: 0.6;
      font-size: 13px;
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(128, 128, 128, 0.2);
      border-top-color: rgba(128, 128, 128, 0.7);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading-box">
    <div class="spinner"></div>
    <span>Loading Manim…</span>
  </div>
  <div id="manim-container" style="display:none;"></div>
  <div id="error-box"></div>

  <script type="module">
    const ENCODED_SCRIPT = "${encodedScript}";

    const container = document.getElementById('manim-container');
    const errorBox = document.getElementById('error-box');
    const loadingBox = document.getElementById('loading-box');

    try {
      // Import manim-web from CDN
      const manimWeb = await import('https://cdn.jsdelivr.net/npm/manim-web@0.3.20/dist/manim-web.browser.js');

      // Expose all exports globally so user code can reference Circle, Scene, etc.
      for (const key of Object.keys(manimWeb)) {
        window[key] = manimWeb[key];
      }

      // Hide loading, show container
      loadingBox.style.display = 'none';
      container.style.display = 'block';

      // Decode the user script from Base64
      const userScriptText = decodeURIComponent(escape(atob(ENCODED_SCRIPT)));
      const is3D = userScriptText.includes('ThreeD') || userScriptText.includes('Dot3D') || userScriptText.includes('Surface3D') || userScriptText.includes('Cube') || userScriptText.includes('Sphere') || userScriptText.includes('Cylinder');
      const isInteractive = is3D || userScriptText.includes('// MODE: INTERACTIVE') || userScriptText.includes('makeDraggable');

      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

      if (isInteractive) {
        // Interactive Mode: Raw Scene without Player timeline overrides
        const SceneClass = is3D ? manimWeb.ThreeDScene : manimWeb.Scene;
        const sceneOptions = {
          width: container.clientWidth,
          height: container.clientHeight,
          ...(is3D && { enableOrbitControls: true, distance: 20 })
        };
        const scene = new SceneClass(container, sceneOptions);
        window.scene = scene;
        
        // Execute directly on the raw scene
        const userFn = new AsyncFunction('scene', userScriptText);
        await userFn(scene);
      } else {
        // Animation Mode: Player with Timeline Scrubber
        const player = new manimWeb.Player(container, {
          width: container.clientWidth,
          height: container.clientHeight,
        });
        window.player = player;

        const userFn = new AsyncFunction('scene', 'player', userScriptText);
        await player.sequence(async (sceneProxy) => {
          window.scene = sceneProxy;
          await userFn(sceneProxy, player);
        });
        
        // Auto-play the sequence
        player.play();
      }

    } catch (err) {
      console.error("Manim execution error:", err);
      loadingBox.style.display = 'none';
      container.style.display = 'none';
      errorBox.style.display = 'block';
      errorBox.textContent = "Error: " + err.message + "\\n\\nStack: " + (err.stack || '(no stack)');
    }
  </script>
</body>
</html>`;
  }, [script, isDark]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'manim_scene').replace(/[^a-zA-Z0-9]/g, '_')}.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/20">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <PlaySquare className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="text-xs font-medium text-foreground/80 truncate">
            {title || 'Manim Animation'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy Script"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download Script"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div style={{ height: '320px', width: '100%' }}>
        <iframe
          ref={iframeRef}
          srcDoc={wrappedHtml}
          title={title ?? 'Manim Animation'}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: 'var(--background)' }}
          sandbox="allow-scripts allow-same-origin allow-downloads"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export function ManimSkeleton({ title }: { title: string }) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/20">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <PlaySquare className="w-4 h-4 text-purple-500 animate-pulse" />
          <span className="text-xs font-medium text-foreground/80">{title || 'Manim Animation'}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-purple-500/60 rounded-full animate-pulse" />
          <span>Generating Script...</span>
        </div>
      </div>

      <div className="h-[320px] bg-muted/20 flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <div className="text-sm text-muted-foreground">Initializing Manim Web...</div>
      </div>
    </div>
  );
}
