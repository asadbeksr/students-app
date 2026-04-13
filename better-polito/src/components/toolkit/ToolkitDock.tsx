'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, PenLine, Focus, X, Zap } from 'lucide-react';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { cn } from '@/lib/utils/cn';

// ─── tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'focus',
    icon: Focus,
    label: 'Focus Mode',
    emoji: '🎯',
    accent: '#424AFB',
    action: (store: ReturnType<typeof useToolkitStore.getState>) => store.toggleFocusMode(),
    isActive: (store: ReturnType<typeof useToolkitStore.getState>) => store.focusMode.isActive,
  },
  {
    id: 'scratchpad',
    icon: PenLine,
    label: 'Scratchpad',
    emoji: '✏️',
    accent: '#9D72FF',
    action: (store: ReturnType<typeof useToolkitStore.getState>) => store.toggleScratchpad(),
    isActive: (store: ReturnType<typeof useToolkitStore.getState>) => store.scratchpad.isOpen,
  },
  {
    id: 'pomodoro',
    icon: Timer,
    label: 'Pomodoro',
    emoji: '🍅',
    accent: '#FF6B8B',
    action: (store: ReturnType<typeof useToolkitStore.getState>) => store.togglePomodoroPanel(),
    isActive: (store: ReturnType<typeof useToolkitStore.getState>) => store.pomodoro.panelOpen,
  },
] as const;

// ─── animation variants ───────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.7 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 22,
      delay: i * 0.06,
    },
  }),
  exit: (i: number) => ({
    opacity: 0,
    y: 10,
    scale: 0.7,
    transition: {
      duration: 0.15,
      delay: (TOOLS.length - 1 - i) * 0.04,
    },
  }),
};

const labelVariants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15 } },
};

// ─── component ────────────────────────────────────────────────────────────────

export function ToolkitDock() {
  const [isOpen, setIsOpen] = useState(false);
  const store = useToolkitStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* tool items — fan upward */}
      <AnimatePresence>
        {isOpen && TOOLS.map((tool, i) => {
          const active = tool.isActive(store);
          return (
            <motion.div
              key={tool.id}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-center gap-3"
            >
              {/* label */}
              <motion.div
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                className="glass-heavy rounded-2xl px-3 py-1.5 shadow-glass"
              >
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">{tool.label}</span>
              </motion.div>

              {/* tool button */}
              <motion.button
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  tool.action(useToolkitStore.getState());
                  if (tool.id !== 'pomodoro') setIsOpen(false);
                }}
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shadow-arc-sticker transition-all',
                  'border',
                )}
                style={{
                  background: active ? tool.accent : 'var(--glass-ctrl)',
                  borderColor: active ? `${tool.accent}60` : 'var(--glass-ctrl-border)',
                }}
              >
                <tool.icon
                  className="w-5 h-5"
                  style={{ color: active ? '#fff' : tool.accent }}
                />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* main trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setIsOpen(o => !o)}
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shadow-glass-lg border transition-all',
          isOpen
            ? 'bg-foreground text-background border-transparent'
            : 'glass-heavy border-[var(--glass-ctrl-border)] text-foreground',
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </motion.div>
      </motion.button>
    </div>
  );
}
