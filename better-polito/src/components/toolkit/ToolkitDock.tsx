'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, PenLine, Focus, Zap, Bot } from 'lucide-react';
import { useToolkitStore, formatTime } from '@/lib/stores/toolkitStore';
import { cn } from '@/lib/utils/cn';

// ─── tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'ai',
    icon: Bot,
    label: 'AI Assistant',
    accent: '#FF8C42',
    action: () => {},
    isActive: () => false,
  },
  {
    id: 'focus',
    icon: Focus,
    label: 'Focus Mode',
    accent: '#424AFB',
    action: (store: ReturnType<typeof useToolkitStore.getState>) => store.toggleFocusMode(),
    isActive: (store: ReturnType<typeof useToolkitStore.getState>) => store.focusMode.isActive,
  },
  {
    id: 'scratchpad',
    icon: PenLine,
    label: 'Scratchpad',
    accent: '#9D72FF',
    action: (store: ReturnType<typeof useToolkitStore.getState>) => store.toggleScratchpad(),
    isActive: (store: ReturnType<typeof useToolkitStore.getState>) => store.scratchpad.isOpen,
  },
  {
    id: 'pomodoro',
    icon: Timer,
    label: 'Pomodoro',
    accent: '#FF6B8B',
    action: (store: ReturnType<typeof useToolkitStore.getState>) => store.togglePomodoroPanel(),
    isActive: (store: ReturnType<typeof useToolkitStore.getState>) => store.pomodoro.panelOpen,
  },
] as const;

const ITEM_STRIDE = 56;

// ─── component ────────────────────────────────────────────────────────────────

export function ToolkitDock() {
  const [isOpen, setIsOpen] = useState(false);
  const store = useToolkitStore();

  // tick interval lives here so it runs regardless of panel visibility
  const pomodoroMode = store.pomodoro.mode;
  useEffect(() => {
    if (pomodoroMode !== 'work' && pomodoroMode !== 'break') return;
    const id = setInterval(() => useToolkitStore.getState().tickTimer(), 1000);
    return () => clearInterval(id);
  }, [pomodoroMode]);

  const isTimerActive = store.pomodoro.mode !== 'idle';
  const isPaused = store.pomodoro.mode === 'paused';
  const timerAccent = store.pomodoro.mode === 'break' ? '#34C759' : '#FF6B8B';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* tool items — emerge from trigger (macOS downloads style) */}
      <AnimatePresence>
        {isOpen && TOOLS.map((tool, i) => {
          const active = tool.isActive(store);
          const distanceToTrigger = (TOOLS.length - i) * ITEM_STRIDE;
          const openDelay  = (TOOLS.length - 1 - i) * 0.055;
          const closeDelay = i * 0.04;

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: distanceToTrigger, scale: 0.72 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: 'spring', stiffness: 500, damping: 30, delay: openDelay },
              }}
              exit={{
                opacity: 0,
                y: distanceToTrigger * 0.55,
                scale: 0.78,
                transition: { type: 'spring', stiffness: 420, damping: 32, delay: closeDelay },
              }}
              className="flex items-center gap-3"
            >
              {/* label pill */}
              <motion.div
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0, transition: { delay: openDelay + 0.06, duration: 0.14 } }}
                exit={{ opacity: 0, x: 6, transition: { duration: 0.1, delay: closeDelay } }}
                className="glass-heavy rounded-2xl px-3 py-1.5 shadow-glass"
              >
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                  {tool.label}
                </span>
              </motion.div>

              {/* tool button */}
              <motion.button
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.90 }}
                onClick={() => {
                  if (tool.id === 'ai') {
                    window.dispatchEvent(new CustomEvent('course-ai-assistant-toggle'));
                  } else {
                    tool.action(useToolkitStore.getState());
                  }
                  setIsOpen(false);
                }}
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shadow-arc-sticker transition-colors border',
                )}
                style={{
                  background: active ? tool.accent : 'var(--glass-ctrl)',
                  borderColor: active ? `${tool.accent}60` : 'var(--glass-ctrl-border)',
                }}
              >
                <tool.icon className="w-5 h-5" style={{ color: active ? '#fff' : tool.accent }} />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* main trigger — becomes mini timer when pomodoro is running */}
      <motion.button
        layout
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          if (isTimerActive) {
            useToolkitStore.getState().togglePomodoroPanel();
          } else {
            setIsOpen(o => !o);
          }
        }}
        className={cn(
          'flex items-center justify-center shadow-glass-lg border transition-colors',
          isTimerActive
            ? 'h-12 min-w-[80px] px-4 rounded-2xl gap-2 text-white border-transparent'
            : cn(
                'w-14 h-14 rounded-2xl',
                isOpen
                  ? 'bg-foreground text-background border-transparent'
                  : 'glass-heavy border-[var(--glass-ctrl-border)] text-foreground',
              ),
        )}
        style={isTimerActive ? {
          background: isPaused ? `${timerAccent}bb` : timerAccent,
        } : undefined}
      >
        {isTimerActive ? (
          <>
            <span
              className={cn('w-1.5 h-1.5 rounded-full bg-white shrink-0', !isPaused && 'animate-pulse')}
            />
            <span className="text-sm font-bold tabular-nums">
              {formatTime(store.pomodoro.secondsLeft)}
            </span>
          </>
        ) : (
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            <Zap className="w-5 h-5" />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
