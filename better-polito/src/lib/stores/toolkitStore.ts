import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── types ────────────────────────────────────────────────────────────────────

export type TimerMode = 'idle' | 'work' | 'break' | 'paused';

interface PomodoroState {
  mode: TimerMode;
  secondsLeft: number;
  workMins: number;
  breakMins: number;
  sessionsCompleted: number;
  soundEnabled: boolean;
  panelOpen: boolean;
}

interface ScratchpadState {
  isOpen: boolean;
  notes: Record<string, string>; // key: 'global' | courseId
  activeKey: string;
}

interface FocusModeState {
  isActive: boolean;
  blockNav: boolean;
}

interface ToolkitStore {
  pomodoro: PomodoroState;
  scratchpad: ScratchpadState;
  focusMode: FocusModeState;

  // Pomodoro actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  tickTimer: () => void;
  toggleSound: () => void;
  setWorkMins: (m: number) => void;
  setBreakMins: (m: number) => void;
  togglePomodoroPanel: () => void;

  // Scratchpad actions
  openScratchpad: (key?: string) => void;
  closeScratchpad: () => void;
  toggleScratchpad: () => void;
  updateNote: (key: string, content: string) => void;
  setActiveKey: (key: string) => void;

  // Focus mode actions
  toggleFocusMode: () => void;
  setBlockNav: (v: boolean) => void;
}

// ─── store ────────────────────────────────────────────────────────────────────

export const useToolkitStore = create<ToolkitStore>()(
  persist(
    (set, get) => ({
      pomodoro: {
        mode: 'idle',
        secondsLeft: 25 * 60,
        workMins: 25,
        breakMins: 5,
        sessionsCompleted: 0,
        soundEnabled: true,
        panelOpen: false,
      },
      scratchpad: {
        isOpen: false,
        notes: { global: '' },
        activeKey: 'global',
      },
      focusMode: {
        isActive: false,
        blockNav: false,
      },

      // ── Pomodoro ──────────────────────────────────────────────────────────

      startTimer: () =>
        set(s => ({
          pomodoro: {
            ...s.pomodoro,
            mode: 'work',
            secondsLeft: s.pomodoro.workMins * 60,
            panelOpen: true,
          },
        })),

      pauseTimer: () =>
        set(s => ({ pomodoro: { ...s.pomodoro, mode: 'paused' } })),

      resumeTimer: () =>
        set(s => ({ pomodoro: { ...s.pomodoro, mode: s.pomodoro.secondsLeft <= s.pomodoro.breakMins * 60 ? 'break' : 'work' } })),

      resetTimer: () =>
        set(s => ({
          pomodoro: { ...s.pomodoro, mode: 'idle', secondsLeft: s.pomodoro.workMins * 60 },
        })),

      skipPhase: () =>
        set(s => {
          const p = s.pomodoro;
          if (p.mode === 'work') {
            return { pomodoro: { ...p, mode: 'break', secondsLeft: p.breakMins * 60 } };
          }
          return { pomodoro: { ...p, mode: 'idle', secondsLeft: p.workMins * 60, sessionsCompleted: p.sessionsCompleted + 1 } };
        }),

      tickTimer: () =>
        set(s => {
          const p = s.pomodoro;
          if (p.mode !== 'work' && p.mode !== 'break') return s;

          if (p.secondsLeft <= 1) {
            // phase complete
            if (p.mode === 'work') {
              return { pomodoro: { ...p, mode: 'break', secondsLeft: p.breakMins * 60 } };
            } else {
              return { pomodoro: { ...p, mode: 'idle', secondsLeft: p.workMins * 60, sessionsCompleted: p.sessionsCompleted + 1 } };
            }
          }

          return { pomodoro: { ...p, secondsLeft: p.secondsLeft - 1 } };
        }),

      toggleSound: () =>
        set(s => ({ pomodoro: { ...s.pomodoro, soundEnabled: !s.pomodoro.soundEnabled } })),

      setWorkMins: (m) =>
        set(s => ({
          pomodoro: { ...s.pomodoro, workMins: m, secondsLeft: s.pomodoro.mode === 'idle' ? m * 60 : s.pomodoro.secondsLeft },
        })),

      setBreakMins: (m) =>
        set(s => ({ pomodoro: { ...s.pomodoro, breakMins: m } })),

      togglePomodoroPanel: () =>
        set(s => ({ pomodoro: { ...s.pomodoro, panelOpen: !s.pomodoro.panelOpen } })),

      // ── Scratchpad ────────────────────────────────────────────────────────

      openScratchpad: (key = 'global') =>
        set(s => ({ scratchpad: { ...s.scratchpad, isOpen: true, activeKey: key } })),

      closeScratchpad: () =>
        set(s => ({ scratchpad: { ...s.scratchpad, isOpen: false } })),

      toggleScratchpad: () =>
        set(s => ({ scratchpad: { ...s.scratchpad, isOpen: !s.scratchpad.isOpen } })),

      updateNote: (key, content) =>
        set(s => ({
          scratchpad: { ...s.scratchpad, notes: { ...s.scratchpad.notes, [key]: content } },
        })),

      setActiveKey: (key) =>
        set(s => ({ scratchpad: { ...s.scratchpad, activeKey: key } })),

      // ── Focus Mode ────────────────────────────────────────────────────────

      toggleFocusMode: () =>
        set(s => ({ focusMode: { ...s.focusMode, isActive: !s.focusMode.isActive } })),

      setBlockNav: (v) =>
        set(s => ({ focusMode: { ...s.focusMode, blockNav: v } })),
    }),
    {
      name: 'better-polito:toolkit',
      // only persist notes, settings, sessions — not panel open states or timer running
      partialize: (s) => ({
        pomodoro: {
          workMins: s.pomodoro.workMins,
          breakMins: s.pomodoro.breakMins,
          sessionsCompleted: s.pomodoro.sessionsCompleted,
          soundEnabled: s.pomodoro.soundEnabled,
        },
        scratchpad: { notes: s.scratchpad.notes },
        focusMode: { blockNav: s.focusMode.blockNav },
      }),
    },
  ),
);

// ── helpers ───────────────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function playBeep(type: 'work' | 'break' = 'work') {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = type === 'work' ? 523 : 440; // C5 for break start, A4 for session end
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}
