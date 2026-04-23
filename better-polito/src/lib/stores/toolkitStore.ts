import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── types ────────────────────────────────────────────────────────────────────

export type TimerMode = 'idle' | 'work' | 'break' | 'paused';
export type DockCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface PomodoroState {
  mode: TimerMode;
  secondsLeft: number;
  workMins: number;
  breakMins: number;
  sessionsCompleted: number;
  soundEnabled: boolean;
  panelOpen: boolean;
  pausedPhase: 'work' | 'break'; // track phase before pause to fix resume bug
}

interface ScratchpadState {
  isOpen: boolean;
  notes: Record<string, string>;
  activeKey: string;
}

interface FocusModeState {
  isActive: boolean;
  blockNav: boolean;
}

interface SidebarState {
  isCollapsed: boolean;
  openGroups: Record<string, boolean>;
}

interface DockState {
  corner: DockCorner;
}

interface ToolkitStore {
  pomodoro: PomodoroState;
  scratchpad: ScratchpadState;
  focusMode: FocusModeState;
  sidebar: SidebarState;
  dock: DockState;

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

  openScratchpad: (key?: string) => void;
  closeScratchpad: () => void;
  toggleScratchpad: () => void;
  updateNote: (key: string, content: string) => void;
  setActiveKey: (key: string) => void;

  toggleFocusMode: () => void;
  setBlockNav: (v: boolean) => void;

  toggleSidebar: () => void;
  setSidebarCollapsed: (c: boolean) => void;
  toggleSidebarGroup: (id: string) => void;

  setDockCorner: (c: DockCorner) => void;
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
        pausedPhase: 'work',
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
      sidebar: {
        isCollapsed: false,
        openGroups: { academics: true },
      },
      dock: {
        corner: 'bottom-right',
      },

      // ── Pomodoro ──────────────────────────────────────────────────────────

      // close panel on start so the floating button becomes the timer
      startTimer: () =>
        set(s => ({
          pomodoro: {
            ...s.pomodoro,
            mode: 'work',
            secondsLeft: s.pomodoro.workMins * 60,
            panelOpen: false,
            pausedPhase: 'work',
          },
        })),

      // save current phase so resume restores correctly
      pauseTimer: () =>
        set(s => ({
          pomodoro: {
            ...s.pomodoro,
            mode: 'paused',
            pausedPhase: s.pomodoro.mode as 'work' | 'break',
          },
        })),

      resumeTimer: () =>
        set(s => ({
          pomodoro: { ...s.pomodoro, mode: s.pomodoro.pausedPhase },
        })),

      resetTimer: () =>
        set(s => ({
          pomodoro: { ...s.pomodoro, mode: 'idle', secondsLeft: s.pomodoro.workMins * 60 },
        })),

      skipPhase: () =>
        set(s => {
          const p = s.pomodoro;
          if (p.mode === 'work' || p.pausedPhase === 'work') {
            return { pomodoro: { ...p, mode: 'break', secondsLeft: p.breakMins * 60, pausedPhase: 'break' as const } };
          }
          return { pomodoro: { ...p, mode: 'idle', secondsLeft: p.workMins * 60, sessionsCompleted: p.sessionsCompleted + 1 } };
        }),

      tickTimer: () =>
        set(s => {
          const p = s.pomodoro;
          if (p.mode !== 'work' && p.mode !== 'break') return s;

          if (p.secondsLeft <= 1) {
            if (p.mode === 'work') {
              return { pomodoro: { ...p, mode: 'break', secondsLeft: p.breakMins * 60, pausedPhase: 'break' as const } };
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

      // ── Sidebar ────────────────────────────────────────────────────────
      toggleSidebar: () =>
        set(s => ({ sidebar: { ...s.sidebar, isCollapsed: !s.sidebar.isCollapsed } })),

      setSidebarCollapsed: (c) =>
        set(s => ({ sidebar: { ...s.sidebar, isCollapsed: c } })),

      toggleSidebarGroup: (id) =>
        set(s => ({
          sidebar: {
            ...s.sidebar,
            openGroups: { ...s.sidebar.openGroups, [id]: !s.sidebar.openGroups[id] }
          }
        })),

      // ── Dock ──────────────────────────────────────────────────────────────
      setDockCorner: (c) =>
        set(s => ({ dock: { ...s.dock, corner: c } })),
    }),
    {
      name: 'better-polito:toolkit',
      partialize: (s) => ({
        pomodoro: {
          workMins: s.pomodoro.workMins,
          breakMins: s.pomodoro.breakMins,
          sessionsCompleted: s.pomodoro.sessionsCompleted,
          soundEnabled: s.pomodoro.soundEnabled,
        },
        scratchpad: { notes: s.scratchpad.notes },
        focusMode: { blockNav: s.focusMode.blockNav },
        sidebar: { isCollapsed: s.sidebar.isCollapsed, openGroups: s.sidebar.openGroups },
        dock: { corner: s.dock.corner },
      }),
      // deep-merge so persisted partial objects don't wipe runtime fields (secondsLeft, mode, etc.)
      merge: (persisted, current) => {
        const p = persisted as Partial<ToolkitStore>;
        return {
          ...current,
          pomodoro:  { ...current.pomodoro,  ...p.pomodoro },
          scratchpad: { ...current.scratchpad, ...p.scratchpad },
          focusMode: { ...current.focusMode,  ...p.focusMode },
          sidebar: { ...current.sidebar, ...p.sidebar },
          dock: { ...current.dock, ...p.dock },
        };
      },
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

    // notes: work-done = triumphant ascending 3-chime, break-done = soft descending 2-chime
    const notes: { freq: number; start: number; duration: number }[] =
      type === 'work'
        ? [
            { freq: 523, start: 0,    duration: 0.18 }, // C5
            { freq: 659, start: 0.22, duration: 0.18 }, // E5
            { freq: 784, start: 0.44, duration: 0.35 }, // G5
          ]
        : [
            { freq: 659, start: 0,    duration: 0.22 }, // E5
            { freq: 523, start: 0.28, duration: 0.35 }, // C5
          ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    masterGain.connect(ctx.destination);

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.freq;

      const t = ctx.currentTime + note.start;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, t + note.duration);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t);
      osc.stop(t + note.duration + 0.05);
    }

    // close context after all notes finish
    setTimeout(() => ctx.close(), (notes[notes.length - 1].start + notes[notes.length - 1].duration + 0.2) * 1000);
  } catch {}
}
