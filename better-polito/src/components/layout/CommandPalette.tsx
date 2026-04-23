'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  BookOpen, User, Search, ArrowRight,
  Timer, PenLine, Focus, Zap, Sun, Moon, ChevronLeft,
  Play, Pause, Square, SkipForward,
} from 'lucide-react';
import { useToolkitStore, formatTime, playBeep } from '@/lib/stores/toolkitStore';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { cn } from '@/lib/utils/cn';
import { NAV_GROUPS } from '@/config/navigation';

type View = 'root' | 'pomodoro' | 'scratchpad';

// ─── course items ─────────────────────────────────────────────────────────────

function useCourseItems() {
  const { data: courses = [] } = useGetCourses();
  return (courses as any[]).map((c: any) => ({
    id: String(c.code ?? c.id ?? c.courseId),
    label: c.name ?? c.shortName ?? c.title ?? 'Course',
    code: c.code ?? c.courseCode ?? '',
    href: `/courses/${c.code ?? c.id ?? c.courseId}`,
  }));
}

// ─── tool commands ─────────────────────────────────────────────────────────────

function useToolCommands(setView: (v: View) => void, close: () => void) {
  const store = useToolkitStore();
  const { pomodoro, scratchpad, focusMode } = store;
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const isTimerActive = pomodoro.mode !== 'idle';
  const timerBadge = isTimerActive
    ? pomodoro.mode === 'paused'
      ? 'Paused'
      : `${formatTime(pomodoro.secondsLeft)} · ${pomodoro.mode === 'break' ? 'Break' : 'Focus'}`
    : null;

  return [
    {
      id: 'pomodoro',
      label: 'Pomodoro Timer',
      description: isTimerActive ? 'Manage your focus timer' : 'Start a 25-min focus session',
      icon: Timer,
      accent: '#FF6B8B',
      badge: timerBadge,
      action: () => setView('pomodoro'),
    },
    {
      id: 'scratchpad',
      label: 'Scratchpad',
      description: 'Quick notes during lectures or study',
      icon: PenLine,
      accent: '#9D72FF',
      badge: scratchpad.isOpen ? 'Open' : null,
      action: () => setView('scratchpad'),
    },
    {
      id: 'focus',
      label: 'Focus Mode',
      description: focusMode.isActive ? 'Exit distraction-free mode' : 'Hide topbar for distraction-free study',
      icon: Focus,
      accent: '#424AFB',
      badge: focusMode.isActive ? 'Active' : null,
      action: () => { store.toggleFocusMode(); close(); },
    },
    {
      id: 'theme',
      label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: isDark ? 'Turn off dark theme' : 'Turn on dark theme',
      icon: isDark ? Sun : Moon,
      accent: isDark ? '#F5A623' : '#6366F1',
      badge: isDark ? 'Dark' : 'Light',
      shortcut: '⌘L',
      action: () => { setTheme(isDark ? 'light' : 'dark'); close(); },
    },
  ];
}

// ─── Pomodoro inline view ──────────────────────────────────────────────────────

function PomodoroView({ onBack }: { onBack: () => void }) {
  const store = useToolkitStore();
  const { pomodoro } = store;

  const isIdle = pomodoro.mode === 'idle';
  const isWork = pomodoro.mode === 'work';
  const isBreak = pomodoro.mode === 'break';
  const isPaused = pomodoro.mode === 'paused';
  const isRunning = isWork || isBreak;

  const modeColor = isBreak ? '#34C759' : '#FF6B8B';
  const modeLabel = isIdle
    ? 'Ready to focus'
    : isWork
    ? 'Focus Session'
    : isBreak
    ? 'Break Time'
    : 'Paused';

  return (
    <div className="p-5 space-y-5">
      {/* header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">Pomodoro Timer</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {pomodoro.sessionsCompleted} session{pomodoro.sessionsCompleted !== 1 ? 's' : ''} today
        </span>
      </div>

      {/* timer display */}
      <div className="text-center py-4 space-y-1">
        <div
          className="text-6xl font-bold tabular-nums tracking-tight transition-colors"
          style={{ color: isIdle ? 'var(--foreground)' : modeColor }}
        >
          {formatTime(pomodoro.secondsLeft)}
        </div>
        <p className="text-sm font-medium transition-colors" style={{ color: isIdle ? 'var(--muted-foreground)' : modeColor }}>
          {modeLabel}
        </p>
      </div>

      {/* controls */}
      <div className="flex gap-2 justify-center flex-wrap">
        {isIdle && (
          <button
            onClick={() => store.startTimer()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#FF6B8B' }}
          >
            <Play className="w-4 h-4" />
            Start Focus
          </button>
        )}

        {(isRunning || isPaused) && (
          <>
            {isRunning ? (
              <button
                onClick={() => store.pauseTimer()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-muted hover:bg-muted/70 text-foreground transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                onClick={() => store.resumeTimer()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: modeColor }}
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            <button
              onClick={() => store.skipPhase()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-muted hover:bg-muted/70 text-foreground transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={() => store.resetTimer()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-muted hover:bg-muted/70 text-foreground transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          </>
        )}
      </div>

      {/* settings row */}
      <div className="flex items-center justify-center gap-6 pt-1 border-t border-border text-xs text-muted-foreground">
        <span>Work: {pomodoro.workMins}m</span>
        <span>Break: {pomodoro.breakMins}m</span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => playBeep('work')}
            className="px-2 py-1 rounded-lg hover:bg-muted transition-colors text-[10px]"
            title="Test work-done sound"
          >
            🍅 test
          </button>
          <button
            onClick={() => playBeep('break')}
            className="px-2 py-1 rounded-lg hover:bg-muted transition-colors text-[10px]"
            title="Test break-done sound"
          >
            ☕ test
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scratchpad inline view ────────────────────────────────────────────────────

function ScratchpadView({ onBack }: { onBack: () => void }) {
  const store = useToolkitStore();
  const { scratchpad } = store;
  const key = scratchpad.activeKey || 'global';
  const value = scratchpad.notes[key] || '';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={onBack}
          className="p-1.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">Scratchpad</span>
        <span className="ml-auto text-xs text-muted-foreground">{value.length} chars</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => store.updateNote(key, e.target.value)}
        placeholder="Jot something down…"
        className="resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none p-4 min-h-[220px] leading-relaxed"
      />
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('root');
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const close = useCallback(() => {
    setOpen(false);
    setView('root');
  }, []);

  const toolCommands = useToolCommands(setView, close);
  const courseItems = useCourseItems();

  const coursesRef = useRef(courseItems);
  useEffect(() => { coursesRef.current = courseItems; }, [courseItems]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    close();
  }, [router, close]);

  // Reset to root when dialog opens fresh (not via custom event)
  useEffect(() => {
    if (open) return; // don't reset if already open
    setView('root');
  }, [open]);

  // Listen for programmatic open with a specific view
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { view?: View };
      setOpen(true);
      if (detail?.view) setView(detail.view);
    };
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        return;
      }

      if (e.key === 'l') {
        e.preventDefault();
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const num = parseInt(e.key, 10);
      if (e.shiftKey && num >= 1 && num <= 9) {
        const course = coursesRef.current[num - 1];
        if (course) {
          e.preventDefault();
          router.push(course.href);
        }
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [router, resolvedTheme, setTheme]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v && view !== 'root') {
      // ESC from a sub-view → go back to root, keep dialog open
      setView('root');
    } else {
      setOpen(v);
      if (!v) setView('root');
    }
  }, [view]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>

          <div className="glass-heavy rounded-3xl overflow-hidden shadow-glass-lg">

            {/* ── Root view ── */}
            {view === 'root' && (
              <Command loop>
                {/* search input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Command.Input
                    placeholder="Search pages or run tools..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <kbd className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-lg px-1.5 py-0.5 font-mono bg-muted/50">
                    ESC
                  </kbd>
                </div>

                <Command.List className="max-h-[420px] overflow-y-auto p-2">
                  <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                    Nothing found.
                  </Command.Empty>

                  {/* ── Tools section ── */}
                  <Command.Group
                    heading="Tools"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                  >
                    {toolCommands.map(tool => (
                      <Command.Item
                        key={tool.id}
                        value={`${tool.label} ${tool.description} tools`}
                        onSelect={() => tool.action()}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-sm text-foreground data-[selected=true]:bg-[var(--glass-inner-hover)] transition-colors group"
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{ background: `${tool.accent}18`, borderColor: `${tool.accent}35` }}
                        >
                          <tool.icon className="w-4 h-4" style={{ color: tool.accent }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tool.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                        </div>

                        {tool.badge && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums"
                            style={{ background: `${tool.accent}20`, color: tool.accent }}
                          >
                            {tool.badge}
                          </span>
                        )}

                        {'shortcut' in tool && tool.shortcut && (
                          <kbd className="text-[11px] text-muted-foreground border border-border rounded-lg px-1.5 py-0.5 font-mono bg-muted/60 shrink-0">
                            {tool.shortcut}
                          </kbd>
                        )}

                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100 shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>

                  {/* ── Courses section ── */}
                  {courseItems.length > 0 && (
                    <Command.Group
                      heading="Courses"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                    >
                      {courseItems.map((course, idx) => (
                        <Command.Item
                          key={course.id}
                          value={`${course.label} ${course.code} course`}
                          onSelect={() => navigate(course.href)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-sm text-foreground data-[selected=true]:bg-[var(--glass-inner-hover)] transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: 'hsl(237,96%,62%,0.1)', borderColor: 'hsl(237,96%,62%,0.25)' }}>
                            <BookOpen className="w-4 h-4" style={{ color: 'hsl(237,96%,62%)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{course.label}</p>
                            {course.code && <p className="text-xs text-muted-foreground">{course.code}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {idx < 9 && (
                              <kbd className="text-[11px] text-muted-foreground border border-border rounded-lg px-1.5 py-0.5 font-mono bg-muted/60">
                                ⌘⇧{idx + 1}
                              </kbd>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100" />
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* ── Nav groups ── */}
                  {NAV_GROUPS.map(group => (
                    <Command.Group
                      key={group.id}
                      heading={group.title}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                    >
                      {group.items.map(item => (
                        <Command.Item
                          key={item.href}
                          value={`${item.label} ${item.description}`}
                          onSelect={() => navigate(item.href)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-sm text-foreground data-[selected=true]:bg-[var(--glass-inner-hover)] transition-colors group"
                        >
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center glass-inner border border-[var(--glass-ctrl-border)]">
                              <item.icon className="w-4 h-4 text-foreground/70" />
                            </div>
                            <span
                              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                              style={{ background: group.accent }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100 shrink-0" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}
                </Command.List>

                {/* footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[11px] text-muted-foreground/60">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    <span>Tools open inline · Pages navigate</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="border border-border rounded px-1 py-0.5 font-mono bg-muted/60">↑↓</kbd> navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="border border-border rounded px-1 py-0.5 font-mono bg-muted/60">↵</kbd> run
                    </span>
                  </div>
                </div>
              </Command>
            )}

            {/* ── Pomodoro sub-view ── */}
            {view === 'pomodoro' && (
              <PomodoroView onBack={() => setView('root')} />
            )}

            {/* ── Scratchpad sub-view ── */}
            {view === 'scratchpad' && (
              <ScratchpadView onBack={() => setView('root')} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
