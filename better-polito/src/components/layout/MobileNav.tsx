'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, BookOpen, Calendar, GraduationCap, ClipboardList, CalendarCheck, MapPin, Ticket, Users, Briefcase, ClipboardCheck, MessageSquare, User, Bot, Brain, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/transcript', label: 'Transcript', icon: GraduationCap },
  { href: '/exams', label: 'Exams', icon: ClipboardList },
  { href: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/places', label: 'Campus Map', icon: MapPin },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/people', label: 'People', icon: Users },
  { href: '/services', label: 'Services', icon: Briefcase },
  { href: '/surveys', label: 'Surveys', icon: ClipboardCheck },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/ai/study-planner', label: 'Study Planner', icon: Brain },
  { href: '/ai/chatbot', label: 'AI Assistant', icon: Bot },
  { href: '/ai/analytics', label: 'Analytics', icon: BarChart3 },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#e5e5e5]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">BP</span>
            </div>
            <span className="text-sm font-semibold">Better Polito</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-[15px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#f5f2ef] text-black'
                    : 'text-[#4e4e4e] hover:bg-[#f5f5f5] hover:text-black'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[#e5e5e5]">
          <p className="text-[10px] text-[#777169]">
            Not affiliated with Politecnico di Torino.
          </p>
        </div>
      </div>
    </div>
  );
}
