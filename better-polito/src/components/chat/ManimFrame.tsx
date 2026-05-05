'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Copy, Code, Check, PlaySquare, Sparkles, Send, X } from 'lucide-react';

interface ManimFrameProps {
  script: string;
  title?: string;
}

export function ManimFrame({ script, title }: ManimFrameProps) {
  const [copied, setCopied] = useState(false);
  const [polishOpen, setPolishOpen] = useState(false);
  const [polishText, setPolishText] = useState('');
  const [polishSent, setPolishSent] = useState(false);
  const polishInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  // Listen for error fix requests from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'manim-error' && iframeRef.current?.contentWindow === e.source) {
        // Dispatch a global event so ChatWindow can auto-send a fix message
        window.dispatchEvent(new CustomEvent('manim-fix-request', {
          detail: { error: e.data.error, script, title }
        }));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [script, title]);

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
      background: #000;
      color: var(--color-text-primary);
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100vh;
      margin: 0;
      position: relative;
    }
    #manim-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    /* Fullscreen: constrain to 16:9 aspect ratio, centered */
    body:fullscreen #manim-container {
      width: 100vw;
      height: 100vh;
      max-width: calc(100vh * 16 / 9);
      max-height: calc(100vw * 9 / 16);
      margin: auto;
      position: absolute;
      top: 0; bottom: 0; left: 0; right: 0;
    }
    #manim-container canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
      object-fit: contain;
    }
    #error-box {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      text-align: center;
      width: 100%;
      height: 100%;
    }
    #error-box .error-msg {
      color: rgba(255,255,255,0.5);
      font-family: monospace;
      font-size: 11px;
      max-width: 80%;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }
    #error-box .error-title {
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      font-weight: 500;
    }
    #fix-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #fix-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.35);
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
    .controls {
      position: absolute;
      bottom: 12px;
      right: 12px;
      display: flex;
      gap: 6px;
      z-index: 1000;
    }
    .ctrl-btn {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .ctrl-btn:hover {
      color: #fff;
      background: rgba(0, 0, 0, 0.7);
      border-color: rgba(255, 255, 255, 0.25);
    }
    .ctrl-btn.visible {
      display: flex;
    }
  </style>
</head>
<body>
  <div id="loading-box">
    <div class="spinner"></div>
    <span>Loading Manim…</span>
  </div>
  <div id="manim-container" style="display:none;"></div>
  <div class="controls">
    <button id="replay-btn" class="ctrl-btn" title="Replay">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
    </button>
    <button id="fs-btn" class="ctrl-btn" title="Fullscreen">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
    </button>
  </div>
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
      // Alias MathTex -> MathTexImage (common user mistake / old naming)
      if (manimWeb.MathTexImage && !window.MathTex) {
        window.MathTex = manimWeb.MathTexImage;
      }

      // Hide loading, show container
      loadingBox.style.display = 'none';
      container.style.display = 'block';

      // Decode the user script from Base64
      let userScriptText = decodeURIComponent(escape(atob(ENCODED_SCRIPT)));

      // --- Preprocess user code ---
      // 1. Strip import statements (all manim-web exports are already global)
      userScriptText = userScriptText.replace(/^\\s*import\\s+\\{[^}]*\\}\\s+from\\s+['"][^'"]*['"];?\\s*$/gm, '');
      userScriptText = userScriptText.replace(/^\\s*import\\s+.*from\\s+['"][^'"]*['"];?\\s*$/gm, '');
      // 2. Strip standalone Scene/container creation (we provide our own)
      //    e.g. const container = document.getElementById('container');
      //    e.g. const scene = new Scene(document.getElementById('container'), { ... });
      userScriptText = userScriptText.replace(/^\\s*const\\s+container\\s*=\\s*document\\.getElementById\\([^)]*\\);?\\s*$/gm, '');
      userScriptText = userScriptText.replace(/^\\s*const\\s+scene\\s*=\\s*new\\s+Scene\\s*\\([\\s\\S]*?\\);\\s*$/gm, '');
      // 3. Replace MathTex constructor with MathTexImage (the actual class name)
      userScriptText = userScriptText.replace(/\\bnew\\s+MathTex\\s*\\(/g, 'new MathTexImage(');

      // --- Detect execution mode ---
      const is3D = userScriptText.includes('ThreeD') || userScriptText.includes('Dot3D') || userScriptText.includes('Surface3D') || userScriptText.includes('Cube') || userScriptText.includes('Sphere') || userScriptText.includes('Cylinder');
      // Updater-based animations (addUpdater + scene.wait) need a raw Scene, not a Player.
      // The Player records a timeline for scrubbing; updaters run in real-time and aren't compatible.
      const usesUpdaters = userScriptText.includes('addUpdater');
      const isInteractive = is3D || usesUpdaters || userScriptText.includes('// MODE: INTERACTIVE') || userScriptText.includes('makeDraggable');

      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

      if (isInteractive) {
        // Raw Scene Mode: for interactive, updater-based, or 3D scenes
        const SceneClass = is3D ? manimWeb.ThreeDScene : manimWeb.Scene;
        // Detect backgroundColor from user code if present
        const bgMatch = userScriptText.match(/backgroundColor\\s*:\\s*(\\w+)/);
        const bgColor = bgMatch ? (window[bgMatch[1]] || '#000000') : '#000000';
        const sceneOptions = {
          width: container.clientWidth,
          height: container.clientHeight,
          backgroundColor: bgColor,
          ...(is3D && { enableOrbitControls: true, distance: 20 })
        };
        let scene = new SceneClass(container, sceneOptions);
        window.scene = scene;
        
        const fsBtn = document.getElementById('fs-btn');
        fsBtn.classList.add('visible');
        fsBtn.onclick = () => {
          if (!document.fullscreenElement) {
            document.body.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen();
          }
        };

        // Execute directly on the raw scene
        const userFn = new AsyncFunction('scene', userScriptText);

        async function runAnimation() {
          const replayBtn = document.getElementById('replay-btn');
          replayBtn.classList.remove('visible');
          await userFn(scene);
          // Animation finished — show replay button
          replayBtn.classList.add('visible');
        }

        document.getElementById('replay-btn').addEventListener('click', async () => {
          // Dispose old scene, create a fresh one
          try { scene.dispose(); } catch {}
          container.innerHTML = '';
          scene = new SceneClass(container, sceneOptions);
          window.scene = scene;
          await runAnimation();
        });

        await runAnimation();
      } else {
        // Animation Mode: Player with Timeline Scrubber
        const player = new manimWeb.Player(container, {
          width: container.clientWidth,
          height: container.clientHeight,
          slides: false,
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
      errorBox.style.display = 'flex';
      const errMsg = err.message || String(err);
      errorBox.innerHTML = '<div class="error-title">Animation failed</div>'
        + '<div class="error-msg">' + errMsg.replace(/</g,'&lt;') + '</div>'
        + '<button id="fix-btn">'
        + '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
        + 'Regenerate</button>';
      document.getElementById('fix-btn').addEventListener('click', () => {
        window.parent.postMessage({ type: 'manim-error', error: errMsg }, '*');
        document.getElementById('fix-btn').textContent = 'Sent to AI…';
        document.getElementById('fix-btn').disabled = true;
      });
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

  const handlePolishOpen = () => {
    setPolishOpen(true);
    setPolishSent(false);
    setPolishText('');
    setTimeout(() => polishInputRef.current?.focus(), 50);
  };

  const handlePolishSubmit = () => {
    if (!polishText.trim()) return;
    window.dispatchEvent(new CustomEvent('manim-polish-request', {
      detail: { feedback: polishText.trim(), script, title }
    }));
    setPolishSent(true);
    setTimeout(() => {
      setPolishOpen(false);
      setPolishSent(false);
      setPolishText('');
    }, 1500);
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
            <Code className="w-3.5 h-3.5" />
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
          allow="fullscreen"
          allowFullScreen
        />
      </div>

      {/* Polish / Refine bar */}
      <div className="border-t border-border/20 bg-card/50">
        {!polishOpen ? (
          <button
            onClick={handlePolishOpen}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Refine animation</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <input
              ref={polishInputRef}
              type="text"
              value={polishText}
              onChange={(e) => setPolishText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePolishSubmit(); if (e.key === 'Escape') setPolishOpen(false); }}
              placeholder="e.g. labels are overlapping, make colors brighter..."
              disabled={polishSent}
              className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none py-1 px-1.5"
            />
            {polishSent ? (
              <span className="flex items-center gap-1 text-xs text-green-500 shrink-0 px-1">
                <Check className="w-3 h-3" /> Sent
              </span>
            ) : (
              <>
                <button
                  onClick={handlePolishSubmit}
                  disabled={!polishText.trim()}
                  className="p-1 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                  title="Send refinement"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPolishOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
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
