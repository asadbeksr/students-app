'use client';

import { useEffect, useRef } from 'react';
import { useToolkitStore, formatTime, playBeep } from '@/lib/stores/toolkitStore';
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, X, Settings2, Coffee, Brain } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ─── floating panel ───────────────────────────────────────────────────────────

export function PomodoroPanel() {
  const { pomodoro, startTimer, pauseTimer, resumeTimer, resetTimer, skipPhase, toggleSound, setWorkMins, setBreakMins, togglePomodoroPanel } = useToolkitStore();
  const prevModeRef = useRef(pomodoro.mode);

  // sound on phase transition
  useEffect(() => {
    const prev = prevModeRef.current;
    const curr = pomodoro.mode;
    if (prev === 'work' && curr === 'break' && pomodoro.soundEnabled) playBeep('work');
    if (prev === 'break' && curr === 'idle' && pomodoro.soundEnabled) playBeep('break');
    prevModeRef.current = curr;
  }, [pomodoro.mode, pomodoro.soundEnabled]);

  // tab title while running
  useEffect(() => {
    if (pomodoro.mode === 'work' || pomodoro.mode === 'break') {
      const emoji = pomodoro.mode === 'work' ? '🍅' : '☕';
      document.title = `${emoji} ${formatTime(pomodoro.secondsLeft)} — Better Polito`;
      return () => { document.title = 'Better Polito'; };
    }
  }, [pomodoro.mode, pomodoro.secondsLeft]);

  if (!pomodoro.panelOpen) return null;

  const isRunning = pomodoro.mode === 'work' || pomodoro.mode === 'break';
  const isPaused = pomodoro.mode === 'paused';
  const isIdle = pomodoro.mode === 'idle';
  const isBreak = pomodoro.mode === 'break';

  const progress = isRunning || isPaused
    ? 1 - pomodoro.secondsLeft / ((isBreak ? pomodoro.breakMins : pomodoro.workMins) * 60)
    : 0;

  const accentColor = isBreak ? '#34C759' : '#FF6B8B';
  const circumference = 2 * Math.PI * 40;

  const dotsFilled = pomodoro.sessionsCompleted === 0 
    ? 0 
    : pomodoro.sessionsCompleted % 4 === 0 
      ? 4 
      : pomodoro.sessionsCompleted % 4;

  return (
    <div className="fixed bottom-24 right-6 z-50 glass-heavy rounded-3xl p-5 w-72 shadow-glass-lg">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isBreak ? <Coffee className="w-4 h-4" style={{ color: accentColor }} /> : <Brain className="w-4 h-4" style={{ color: accentColor }} />}
          <span className="text-sm font-semibold text-foreground">
            {isBreak ? 'Break time' : isIdle ? 'Pomodoro' : 'Focus session'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleSound} className="glass-ctrl w-7 h-7 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity">
            {pomodoro.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-muted-foreground" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button onClick={togglePomodoroPanel} className="glass-ctrl w-7 h-7 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ring timer */}
      <div className="flex flex-col items-center gap-4 my-2">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* track */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"
              className="text-muted/40" />
            {/* progress */}
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6"
              strokeLinecap="round"
              stroke={accentColor}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-foreground">{formatTime(pomodoro.secondsLeft)}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {isBreak ? 'break' : 'focus'}
            </span>
          </div>
        </div>

        {/* sessions */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={cn('w-2 h-2 rounded-full transition-colors',
              i < dotsFilled ? 'bg-[#FF6B8B]' : 'bg-muted')} />
          ))}
          <span className="text-[11px] text-muted-foreground ml-1">{pomodoro.sessionsCompleted} done</span>
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button onClick={resetTimer} className="glass-ctrl w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity">
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </button>

        {isIdle ? (
          <button onClick={startTimer}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: accentColor }}>
            <Play className="w-4 h-4 fill-white" /> Start
          </button>
        ) : isRunning ? (
          <button onClick={pauseTimer}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: accentColor }}>
            <Pause className="w-4 h-4 fill-white" /> Pause
          </button>
        ) : (
          <button onClick={resumeTimer}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: accentColor }}>
            <Play className="w-4 h-4 fill-white" /> Resume
          </button>
        )}

        <button onClick={skipPhase} className="glass-ctrl w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity">
          <SkipForward className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* duration settings */}
      <div className="mt-4 pt-4 border-t border-[var(--glass-ctrl-border)] grid grid-cols-2 gap-2">
        {[
          { label: '🍅 Focus', value: pomodoro.workMins, min: 5, max: 60, step: 5, set: setWorkMins },
          { label: '☕ Break', value: pomodoro.breakMins, min: 1, max: 30, step: 1, set: setBreakMins },
        ].map(({ label, value, min, max, step, set }) => (
          <div key={label} className="glass-inner rounded-2xl p-2.5 flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => set(Math.max(min, value - step))}
                className="w-5 h-5 rounded-lg glass-ctrl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">−</button>
              <span className="text-sm font-semibold text-foreground tabular-nums flex-1 text-center">{value}m</span>
              <button onClick={() => set(Math.min(max, value + step))}
                className="w-5 h-5 rounded-lg glass-ctrl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── topbar chip (shown when timer is active) ─────────────────────────────────

export function PomodoroChip() {
  const { pomodoro, togglePomodoroPanel } = useToolkitStore();
  const isActive = pomodoro.mode === 'work' || pomodoro.mode === 'break' || pomodoro.mode === 'paused';

  if (!isActive) return null;

  const isBreak = pomodoro.mode === 'break';
  const isPaused = pomodoro.mode === 'paused';
  const accent = isBreak ? '#34C759' : '#FF6B8B';

  return (
    <button
      onClick={togglePomodoroPanel}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:opacity-80"
      style={{ borderColor: `${accent}40`, background: `${accent}15`, color: accent }}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', !isPaused && 'animate-pulse')} style={{ background: accent }} />
      {isBreak ? '☕' : '🍅'} {formatTime(pomodoro.secondsLeft)}
      {isPaused && <span className="text-[10px] opacity-70">paused</span>}
    </button>
  );
}
