'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize2, Minimize2, Download, ExternalLink,
  X, PictureInPicture2, RotateCcw, RotateCw,
  Settings, ChevronRight,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────── */
function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface VideoPlayerProps {
  src: string;
  title: string;
  onClose?: () => void;
  externalUrl?: string;
}

export default function VideoPlayer({ src, title, onClose, externalUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpeedNudge, setShowSpeedNudge] = useState<string | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── control visibility ─────────────────────────────────────────── */
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setShowControls(true);
    if (playing && !seeking && !showSettings) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing, seeking, showSettings]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); };
  }, [playing, seeking, showSettings, resetHideTimer]);

  /* ── keyboard shortcuts ─────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      const v = videoRef.current;
      if (!v) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + (e.shiftKey ? 30 : 5));
          showNudge(`+${e.shiftKey ? 30 : 5}s`);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - (e.shiftKey ? 30 : 5));
          showNudge(`-${e.shiftKey ? 30 : 5}s`);
          break;
        case 'ArrowUp':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          break;
        case 'ArrowDown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          break;
        case 'm':
          e.preventDefault();
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case '>':
          e.preventDefault();
          changeSpeedBy(1);
          break;
        case '<':
          e.preventDefault();
          changeSpeedBy(-1);
          break;
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          e.preventDefault();
          if (v.duration) v.currentTime = v.duration * (parseInt(e.key) / 10);
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  function showNudge(text: string) {
    setShowSpeedNudge(text);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setShowSpeedNudge(null), 700);
  }

  function changeSpeedBy(dir: number) {
    const v = videoRef.current;
    if (!v) return;
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, idx + dir))];
    v.playbackRate = next;
    setSpeed(next);
    showNudge(`${next}×`);
  }

  /* ── video events ───────────────────────────────────────────────── */
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || seeking) return;
    setCurrentTime(v.currentTime);
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (!v || !v.buffered.length) return;
    setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  const onDurationChange = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  const onPlay = () => setPlaying(true);
  const onPause = () => setPlaying(false);
  const onWaiting = () => setLoading(true);
  const onCanPlay = () => setLoading(false);
  const onEnded = () => setPlaying(false);
  const onError = () => setError('Failed to load video');

  /* ── fullscreen ─────────────────────────────────────────────────── */
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ── picture-in-picture ─────────────────────────────────────────── */
  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPiP(false);
    } else {
      await v.requestPictureInPicture();
      setIsPiP(true);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);
    v.addEventListener('enterpictureinpicture', onEnterPiP);
    v.addEventListener('leavepictureinpicture', onLeavePiP);
    return () => {
      v.removeEventListener('enterpictureinpicture', onEnterPiP);
      v.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, []);

  /* ── seek bar interaction ───────────────────────────────────────── */
  const getSeekPositionFromEvent = (e: React.MouseEvent | MouseEvent): number => {
    const bar = seekBarRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pct * duration;
  };

  const onSeekMouseDown = (e: React.MouseEvent) => {
    setSeeking(true);
    const time = getSeekPositionFromEvent(e);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  useEffect(() => {
    if (!seeking) return;
    const onMove = (e: MouseEvent) => {
      const time = getSeekPositionFromEvent(e);
      setCurrentTime(time);
      if (videoRef.current) videoRef.current.currentTime = time;
    };
    const onUp = () => setSeeking(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeking, duration]);

  /* ── volume ─────────────────────────────────────────────────────── */
  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (v) { v.volume = val; v.muted = val === 0; }
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && volume === 0) { v.volume = 0.5; setVolume(0.5); }
  };

  /* ── play/pause ─────────────────────────────────────────────────── */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
    showNudge(`${secs > 0 ? '+' : ''}${secs}s`);
  };

  /* ── derived ─────────────────────────────────────────────────────── */
  const progress = duration ? currentTime / duration : 0;
  const bufferedPct = duration ? buffered / duration : 0;
  const effectiveVolume = muted ? 0 : volume;
  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-black select-none relative group"
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
    >
      {/* ── video element ────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={src}
        className="flex-1 w-full object-contain cursor-pointer"
        onTimeUpdate={onTimeUpdate}
        onProgress={onProgress}
        onDurationChange={onDurationChange}
        onPlay={onPlay}
        onPause={onPause}
        onWaiting={onWaiting}
        onCanPlay={onCanPlay}
        onEnded={onEnded}
        onError={onError}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        preload="metadata"
      />

      {/* ── error overlay ────────────────────────────────────────── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
          <p className="font-semibold text-red-400">{error}</p>
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white underline">
              <ExternalLink className="h-3.5 w-3.5" /> Open in browser
            </a>
          )}
        </div>
      )}

      {/* ── buffering spinner ────────────────────────────────────── */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        </div>
      )}

      {/* ── center nudge ─────────────────────────────────────────── */}
      {showSpeedNudge && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
            {showSpeedNudge}
          </div>
        </div>
      )}

      {/* ── top header ───────────────────────────────────────────── */}
      <div
        className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 py-3 flex items-center justify-between transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        <h2 className="text-sm font-semibold text-white/90 truncate flex-1 min-w-0 mr-4">{title}</h2>
        <div className="flex items-center gap-1 shrink-0">
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          <a href={src} download={title}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── bottom controls ──────────────────────────────────────── */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-10 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      >
        {/* seek bar */}
        <div
          ref={seekBarRef}
          className="relative h-1.5 rounded-full bg-white/20 cursor-pointer mb-3 group/seek hover:h-2.5 transition-all duration-150"
          onMouseDown={onSeekMouseDown}
        >
          {/* buffered */}
          <div
            className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
            style={{ width: `${bufferedPct * 100}%` }}
          />
          {/* played */}
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
          {/* thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        {/* control row */}
        <div className="flex items-center gap-2">
          {/* skip back */}
          <button
            onClick={() => skip(-10)}
            className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
            title="Back 10s (←)"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* play/pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-white/80 transition-colors p-2 hover:bg-white/10 rounded-xl"
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playing
              ? <Pause className="h-5 w-5 fill-current" />
              : <Play className="h-5 w-5 fill-current" />}
          </button>

          {/* skip forward */}
          <button
            onClick={() => skip(10)}
            className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
            title="Forward 10s (→)"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg" title="Mute (m)">
              <VolumeIcon className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={effectiveVolume}
              onChange={onVolumeChange}
              className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200 accent-primary cursor-pointer h-1"
            />
          </div>

          {/* time */}
          <span className="text-white/60 text-xs tabular-nums ml-1 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* spacer */}
          <div className="flex-1" />

          {/* speed */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${showSettings ? 'text-primary bg-primary/15' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Playback speed"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{speed}×</span>
            </button>
            {showSettings && (
              <div className="absolute right-0 bottom-full mb-2 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-1 min-w-[120px] shadow-2xl">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-2.5 py-1">Speed</p>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const v = videoRef.current;
                      if (v) v.playbackRate = s;
                      setSpeed(s);
                      setShowSettings(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors ${speed === s ? 'text-primary font-semibold' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    {s === 1 ? 'Normal' : `${s}×`}
                    {speed === s && <ChevronRight className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Picture in picture */}
          {'pictureInPictureEnabled' in document && (
            <button
              onClick={togglePiP}
              className={`text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg ${isPiP ? 'text-primary' : ''}`}
              title="Picture-in-Picture"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </button>
          )}

          {/* fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
            title="Fullscreen (f)"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        {/* keyboard hints */}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-white/25 select-none">
          <span>Space: play/pause</span>
          <span>← →: seek 5s</span>
          <span>↑ ↓: volume</span>
          <span>m: mute</span>
          <span>f: fullscreen</span>
        </div>
      </div>

      {/* click outside settings to close */}
      {showSettings && (
        <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
      )}
    </div>
  );
}
