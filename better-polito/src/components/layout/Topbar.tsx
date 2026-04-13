'use client';
import { useSession } from 'next-auth/react';
import { Menu, Bell, PenLine, Timer, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useGetNotifications, useMarkNotificationAsRead } from '@/lib/queries/studentHooks';
import { useMemo } from 'react';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { PomodoroChip } from '@/components/toolkit/PomodoroTimer';

function NotificationBell() {
  const { data: notifications = [] } = useGetNotifications();
  const markRead = useMarkNotificationAsRead();
  const all = notifications as any[];
  const unread = useMemo(() => all.filter(n => !n.isRead), [all]);
  const recent = all.slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full shrink-0">
          <Bell className="w-5 h-5 text-foreground" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unread.length > 0 && (
            <p className="text-xs text-muted-foreground">{unread.length} unread</p>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          recent.map((n: any, i: number) => (
            <DropdownMenuItem
              key={n.id ?? i}
              className={`flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer ${!n.isRead ? 'bg-muted/50' : ''}`}
              onClick={() => n.id && !n.isRead && markRead.mutate(n.id)}
            >
              <div className="flex items-center gap-2 w-full">
                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />}
                <p className="text-sm font-medium text-foreground truncate flex-1">{n.title ?? n.subject}</p>
                {n.createdAt && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              {n.body && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">{n.body}</p>
              )}
            </DropdownMenuItem>
          ))
        )}
        <div className="border-t border-border px-3 py-2">
          <Link href="/messages" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all messages →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const routeMap: Record<string, { title: string, desc: string }> = {
  '/dashboard': { title: 'Dashboard', desc: "Here's what's happening with your studies." },
  '/courses': { title: 'Courses', desc: 'Your enrolled courses this semester.' },
  '/agenda': { title: 'Agenda', desc: 'Your upcoming classes and events.' },
  '/transcript': { title: 'Transcript', desc: 'Your academic record and grades.' },
  '/exams': { title: 'Exams', desc: 'Manage your exam bookings and results.' },
  '/bookings': { title: 'Bookings', desc: 'Your room and facility reservations.' },
  '/campus-map': { title: 'Campus Map', desc: 'Find your way around PoliTO.' },
  '/tickets': { title: 'Tickets', desc: 'Support requests and communications.' },
  '/people': { title: 'People', desc: 'Search for students and professors.' },
  '/services': { title: 'Services', desc: 'Additional university services.' },
  '/surveys': { title: 'Surveys', desc: 'Pending evaluations.' },
  '/messages': { title: 'Messages', desc: 'Official student communications.' },
  '/profile': { title: 'Profile', desc: 'Manage your account settings.' },
};

function getHeaderInfo(pathname: string) {
  if (routeMap[pathname]) return routeMap[pathname];
  if (pathname.startsWith('/courses/')) return { title: 'Course Details', desc: 'Manage course materials and notices.' };
  if (pathname.startsWith('/tickets/')) return { title: 'Ticket Thread', desc: 'View and reply to ticket.' };
  if (pathname.startsWith('/ai/')) return { title: 'AI Features', desc: 'Supercharge your studies with AI.' };
  return null;
}

interface TopbarProps {
  onMobileMenuOpen?: () => void;
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { data: session } = useSession();
  const username = session?.user?.name ?? '';
  const initials = username.slice(0, 2).toUpperCase();

  const pathname = usePathname();
  const headerInfo = getHeaderInfo(pathname);
  const { togglePomodoroPanel, toggleScratchpad, toggleFocusMode, focusMode, pomodoro } = useToolkitStore();

  // Hide Topbar explicitly on Desktop for Course Details (it provides its own desktop header)
  const isCourseDetail = !!pathname.match(/^\/courses\/[^/]+$/);

  return (
    <div className={cn("bg-card border-b border-border shrink-0 sticky top-0 z-40 transition-colors", isCourseDetail ? "flex md:hidden" : "block")}>
      <div className="min-h-[73px] w-full px-3 md:px-6 py-3 md:py-0 flex items-center md:flex-row gap-3 md:gap-6">
        
        {/* Mobile menu and Brand */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuOpen}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="text-primary text-[11px] font-bold">BP</span>
            </div>
          </Link>
        </div>

        {/* Dynamic Page Info */}
        <div className="flex-shrink-0 min-w-0 flex-1 pl-1">
          {headerInfo ? (
            <>
              <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{headerInfo.title}</h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5 truncate hidden sm:block">
                {headerInfo.desc}
              </p>
            </>
          ) : (
            <h1 className="text-lg md:text-xl font-semibold text-foreground truncate hidden lg:block">Better Polito</h1>
          )}
        </div>

        {/* ⌘K hint */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border glass-ctrl hover:opacity-80 transition-opacity text-xs text-muted-foreground shrink-0"
        >
          <span>Search</span>
          <kbd className="font-mono text-[10px] bg-muted border border-border rounded px-1">⌘K</kbd>
        </button>

        {/* Pomodoro live chip */}
        <PomodoroChip />

        {/* Toolkit buttons */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {/* Pomodoro open */}
          <Button
            variant="ghost" size="icon"
            onClick={togglePomodoroPanel}
            title="Pomodoro timer"
            className={cn("rounded-xl w-8 h-8", pomodoro.panelOpen && "bg-[#FF6B8B]/10 text-[#FF6B8B]")}
          >
            <Timer className="w-4 h-4" />
          </Button>

          {/* Scratchpad */}
          <Button
            variant="ghost" size="icon"
            onClick={toggleScratchpad}
            title="Scratchpad (Ctrl+Shift+N)"
            className="rounded-xl w-8 h-8"
          >
            <PenLine className="w-4 h-4" />
          </Button>

          {/* Focus Mode */}
          <Button
            variant="ghost" size="icon"
            onClick={toggleFocusMode}
            title="Focus mode"
            className={cn("rounded-xl w-8 h-8", focusMode.isActive && "bg-[#424AFB]/10 text-[#424AFB]")}
          >
            <Focus className="w-4 h-4" />
          </Button>
        </div>

        {/* Notification Bell */}
        <NotificationBell />
      </div>
    </div>
  );
}
