'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  LayoutDashboard, BookOpen, Calendar, GraduationCap, ClipboardList,
  CalendarCheck, MapPin, Ticket, Users, Briefcase, ClipboardCheck,
  MessageSquare, User, Bot, Brain, BarChart3, Search, ArrowRight,
} from 'lucide-react';

// ─── nav registry ─────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',  label: 'Home',        icon: LayoutDashboard, shortcut: '⌘1', description: 'Your personalised dashboard' },
      { href: '/courses',    label: 'Courses',     icon: BookOpen,        shortcut: '⌘2', description: 'Enrolled courses & materials' },
      { href: '/exams',      label: 'Exams',       icon: ClipboardList,   shortcut: '⌘3', description: 'Book and manage exams' },
      { href: '/agenda',     label: 'Agenda',      icon: Calendar,        shortcut: '⌘4', description: 'Today\'s classes & timetable' },
      { href: '/messages',   label: 'Messages',    icon: MessageSquare,   shortcut: '⌘5', description: 'Official university messages' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/transcript', label: 'Transcript',  icon: GraduationCap,   description: 'Your grades & academic record' },
      { href: '/bookings',   label: 'Bookings',    icon: CalendarCheck,   description: 'Room & facility reservations' },
      { href: '/surveys',    label: 'Surveys',     icon: ClipboardCheck,  description: 'Pending course evaluations' },
    ],
  },
  {
    label: 'Campus',
    items: [
      { href: '/places',     label: 'Campus Map',  icon: MapPin,          description: 'Find rooms and buildings' },
      { href: '/services',   label: 'Services',    icon: Briefcase,       description: 'University services' },
      { href: '/tickets',    label: 'Tickets',     icon: Ticket,          description: 'Support requests' },
      { href: '/people',     label: 'People',      icon: Users,           description: 'Search students & professors' },
    ],
  },
  {
    label: 'AI',
    items: [
      { href: '/ai/chatbot',       label: 'AI Assistant',  icon: Bot,      description: 'Chat with your AI study buddy' },
      { href: '/ai/study-planner', label: 'Study Planner', icon: Brain,    description: 'AI-powered study schedule' },
      { href: '/ai/analytics',     label: 'Analytics',     icon: BarChart3,description: 'Academic performance insights' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/profile',    label: 'Profile',     icon: User,            description: 'Manage your account' },
    ],
  },
];

// Accent colors per group (Arc-style)
const GROUP_ACCENTS: Record<string, string> = {
  Main:      'hsl(237,96%,62%)',
  Academics: 'hsl(135,59%,49%)',
  Campus:    'hsl(258,100%,72%)',
  AI:        'hsl(28,100%,63%)',
  Account:   'hsl(348,100%,71%)',
};

// ─── component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      // ⌘K — toggle palette
      if (e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        return;
      }

      // ⌘1–5 — direct page shortcuts (skip if typing in input/textarea)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const shortcuts: Record<string, string> = {
        '1': '/dashboard',
        '2': '/courses',
        '3': '/exams',
        '4': '/agenda',
        '5': '/messages',
      };
      if (shortcuts[e.key]) {
        e.preventDefault();
        router.push(shortcuts[e.key]);
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [router]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        {/* backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* panel */}
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <Command
            className="glass-heavy rounded-3xl overflow-hidden"
            loop
          >
            {/* search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Command.Input
                placeholder="Go to a page..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-lg px-1.5 py-0.5 font-mono bg-muted/50">
                ESC
              </kbd>
            </div>

            {/* results */}
            <Command.List className="max-h-[360px] overflow-y-auto p-2">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                No pages found.
              </Command.Empty>

              {NAV_GROUPS.map(group => (
                <Command.Group
                  key={group.label}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                >
                  {group.items.map(item => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} ${item.description}`}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-sm text-foreground data-[selected=true]:bg-[var(--glass-inner-hover)] transition-colors"
                    >
                      {/* icon with arc accent dot */}
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
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {'shortcut' in item && item.shortcut && (
                          <kbd className="text-[11px] text-muted-foreground border border-border rounded-lg px-1.5 py-0.5 font-mono bg-muted/60">
                            {item.shortcut}
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
              <span>Type to search</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 py-0.5 font-mono bg-muted/60">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 py-0.5 font-mono bg-muted/60">↵</kbd> go
                </span>
              </div>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
