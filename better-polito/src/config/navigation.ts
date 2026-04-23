import {
  BookOpen, Calendar, GraduationCap, ClipboardList,
  Bot, Brain,
  // hidden for now — campus / services / directory
  // CalendarCheck, MapPin, Ticket, Users, Briefcase, ClipboardCheck, MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  id: string;
  title: string;
  accent: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'academics',
    title: 'Academics',
    accent: 'hsl(237,96%,62%)',
    items: [
      { href: '/courses',     label: 'Courses',    icon: BookOpen,        description: 'Enrolled courses & materials'       },
      { href: '/calendar',    label: 'Calendar',   icon: Calendar,        description: "Today's classes & timetable"        },
      { href: '/exams',       label: 'Exams',      icon: ClipboardList,   description: 'Book and manage exams'              },
      { href: '/transcript',  label: 'Transcript', icon: GraduationCap,   description: 'Grades & performance analytics'     },
    ],
  },
  {
    id: 'ai',
    title: 'AI Features',
    accent: 'hsl(28,100%,63%)',
    items: [
      { href: '/ai/chatbot',       label: 'AI Assistant',  icon: Bot,      description: 'Chat with your AI study buddy'     },
      { href: '/ai/study-planner', label: 'Study Planner', icon: Brain,    description: 'AI-powered study schedule'         },
    ],
  },
];

// ── Hidden pages (not deleted, just not shown) ────────────────────────────────
// Campus & Services: /messages /bookings /places /services /tickets
// Directory:         /people /surveys
