'use client';

import { useEffect, useRef } from 'react';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { X, Trash2, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { key: 'global', label: 'Global', icon: Globe },
];

export function Scratchpad() {
  const { scratchpad, closeScratchpad, updateNote, setActiveKey, toggleScratchpad } = useToolkitStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // keyboard shortcut: Ctrl+Shift+N
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        toggleScratchpad();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleScratchpad]);

  // focus textarea when opened
  useEffect(() => {
    if (scratchpad.isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [scratchpad.isOpen]);

  if (!scratchpad.isOpen) return null;

  const activeContent = scratchpad.notes[scratchpad.activeKey] ?? '';
  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;
  const charCount = activeContent.length;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col glass-heavy border-l border-[var(--glass-border)] shadow-[-18px_0_42px_rgba(0,0,0,0.24)]">

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-ctrl-border)] shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Scratchpad</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateNote(scratchpad.activeKey, '')}
              title="Clear note"
              className="glass-ctrl w-7 h-7 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={closeScratchpad}
              className="glass-ctrl w-7 h-7 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--glass-ctrl-border)] shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                scratchpad.activeKey === tab.key
                  ? 'bg-foreground text-background'
                  : 'glass-inner text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
              {scratchpad.notes[tab.key] && (
                <span className="w-1.5 h-1.5 rounded-full bg-arc-blue shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* textarea */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <textarea
            ref={textareaRef}
            value={activeContent}
            onChange={e => updateNote(scratchpad.activeKey, e.target.value)}
            placeholder={`Jot anything down...\n\nSupports plain text — great for:\n• Quick notes during lectures\n• Exam reminders\n• Todo lists`}
            className={cn(
              'flex-1 w-full resize-none bg-transparent px-5 py-4',
              'text-sm text-foreground placeholder:text-muted-foreground/50',
              'outline-none font-mono leading-relaxed',
            )}
            spellCheck={false}
          />
        </div>

        {/* footer */}
        <div className="shrink-0 px-5 py-3 border-t border-[var(--glass-ctrl-border)] flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/60">
            {wordCount} words · {charCount} chars
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            Auto-saved locally
          </span>
        </div>
      </div>
  );
}
