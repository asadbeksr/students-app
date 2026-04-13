'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Calendar, GraduationCap, ClipboardList,
  CalendarCheck, MapPin, Ticket, Users, Briefcase, ClipboardCheck,
  MessageSquare, User, Bot, Brain, BarChart3, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Separator } from '@/components/ui/separator';

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
];

const aiItems = [
  { href: '/ai/study-planner', label: 'Study Planner', icon: Brain },
  { href: '/ai/chatbot', label: 'AI Assistant', icon: Bot },
  { href: '/ai/analytics', label: 'Analytics', icon: BarChart3 },
];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-[15px] font-medium tracking-[0.15px] transition-all duration-150',
        isActive
          ? 'bg-[#f5f2ef] text-black shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset]'
          : 'text-[#4e4e4e] hover:bg-[#f5f5f5] hover:text-black'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {isActive && <ChevronRight className="w-3 h-3 text-[#777169]" />}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-[#e5e5e5] overflow-y-auto">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white text-xs font-bold">BP</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-black">Better Polito</span>
            <span className="ml-2 inline-flex items-center rounded-full bg-[#f5f2ef] px-1.5 py-0.5 text-[10px] font-medium text-[#777169]">
              unofficial
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <div className="pt-4 pb-1">
          <Separator />
        </div>

        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-[#777169] uppercase tracking-widest">
          AI Features
        </p>

        {aiItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer disclaimer */}
      <div className="px-4 py-3 border-t border-[#e5e5e5]">
        <p className="text-[10px] text-[#777169] leading-relaxed">
          Not affiliated with Politecnico di Torino.{' '}
          <a
            href="https://github.com/polito/students-app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#4e4e4e]"
          >
            EUPL v1.2
          </a>
        </p>
      </div>
    </aside>
  );
}
