'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  LayoutDashboard, BookOpen, Calendar, GraduationCap, ClipboardList,
  CalendarCheck, MapPin, Ticket, Users, Briefcase, ClipboardCheck,
  MessageSquare, User, Bot, Brain, BarChart3, Search, ArrowRight,
  Timer, PenLine, Focus, Zap, Sun, Moon,
} from 'lucide-react';
import { useToolkitStore, formatTime } from '@/lib/stores/toolkitStore';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { cn } from '@/lib/utils/cn';

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

function useToolCommands() {
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
      action: () => store.togglePomodoroPanel(),
    },
    {
      id: 'scratchpad',
      label: 'Scratchpad',
      description: 'Quick notes during lectures or study',
      icon: PenLine,
      accent: '#9D72FF',
      badge: scratchpad.isOpen ? 'Open' : null,
      action: () => store.toggleScratchpad(),
    },
    {
      id: 'focus',
      label: 'Focus Mode',
      description: focusMode.isActive ? 'Exit distraction-free mode' : 'Hide topbar for distraction-free study',
      icon: Focus,
      accent: '#424AFB',
      badge: focusMode.isActive ? 'Active' : null,
      action: () => store.toggleFocusMode(),
    },
    {
      id: 'theme',
      label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: isDark ? 'Turn off dark theme' : 'Turn on dark theme',
      icon: isDark ? Sun : Moon,
      accent: isDark ? '#F5A623' : '#6366F1',
      badge: isDark ? 'Dark' : 'Light',
      shortcut: '⌘L',
      action: () => setTheme(isDark ? 'light' : 'dark'),
    },
  ];
}

// ─── nav registry ─────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Home', icon: LayoutDashboard, description: 'Your personalised dashboard' },
      { href: '/courses', label: 'Courses', icon: BookOpen, description: 'Enrolled courses & materials' },
      { href: '/exams', label: 'Exams', icon: ClipboardList, description: 'Book and manage exams' },
      { href: '/agenda', label: 'Agenda', icon: Calendar, description: "Today's classes & timetable" },
      { href: '/messages', label: 'Messages', icon: MessageSquare, description: 'Official university messages' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/transcript', label: 'Transcript', icon: GraduationCap, description: 'Your grades & academic record' },
      { href: '/bookings', label: 'Bookings', icon: CalendarCheck, description: 'Room & facility reservations' },
      { href: '/surveys', label: 'Surveys', icon: ClipboardCheck, description: 'Pending course evaluations' },
    ],
  },
  {
    label: 'Campus',
    items: [
      { href: '/places', label: 'Campus Map', icon: MapPin, description: 'Find rooms and buildings' },
      { href: '/services', label: 'Services', icon: Briefcase, description: 'University services' },
      { href: '/tickets', label: 'Tickets', icon: Ticket, description: 'Support requests' },
      { href: '/people', label: 'People', icon: Users, description: 'Search students & professors' },
    ],
  },
  {
    label: 'AI',
    items: [
      { href: '/ai/chatbot', label: 'AI Assistant', icon: Bot, description: 'Chat with your AI study buddy' },
      { href: '/ai/study-planner', label: 'Study Planner', icon: Brain, description: 'AI-powered study schedule' },
      { href: '/ai/analytics', label: 'Analytics', icon: BarChart3, description: 'Academic performance insights' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/profile', label: 'Profile', icon: User, description: 'Manage your account' },
    ],
  },
];

const GROUP_ACCENTS: Record<string, string> = {
  Main: 'hsl(237,96%,62%)',
  Academics: 'hsl(135,59%,49%)',
  Campus: 'hsl(258,100%,72%)',
  AI: 'hsl(28,100%,63%)',
  Account: 'hsl(348,100%,71%)',
};

// ─── component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toolCommands = useToolCommands();
  const courseItems = useCourseItems();
  const { resolvedTheme, setTheme } = useTheme();

  // keep a stable ref so the keydown handler always sees the latest courses
  const coursesRef = useRef(courseItems);
  useEffect(() => { coursesRef.current = courseItems; }, [courseItems]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  const runTool = useCallback((action: () => void) => {
    action();
    setOpen(false);
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

      // ⌘L — toggle dark/light mode from anywhere
      if (e.key === 'l') {
        e.preventDefault();
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // ⌘⇧1–9 — jump to the Nth enrolled course
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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Command className="glass-heavy rounded-3xl overflow-hidden shadow-glass-lg" loop>

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
                    onSelect={() => runTool(tool.action)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-sm text-foreground data-[selected=true]:bg-[var(--glass-inner-hover)] transition-colors group"
                  >
                    {/* colored icon */}
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
                  key={group.label}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                >
                  {group.items.map(item => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} ${'description' in item ? item.description : ''}`}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-sm text-foreground data-[selected=true]:bg-[var(--glass-inner-hover)] transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center glass-inner border border-[var(--glass-ctrl-border)]">
                          <item.icon className="w-4 h-4 text-foreground/70" />
                        </div>
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                          style={{ background: GROUP_ACCENTS[group.label] }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.label}</p>
                        {'description' in item && item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {typeof (item as { shortcut?: unknown }).shortcut === 'string' && (
                          <kbd className="text-[11px] text-muted-foreground border border-border rounded-lg px-1.5 py-0.5 font-mono bg-muted/60">
                            {(item as { shortcut?: string }).shortcut}
                          </kbd>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100" />
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>

            {/* footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[11px] text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                <span>Tools run instantly · Pages navigate</span>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
