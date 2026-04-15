'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { giphyService } from '@/lib/giphyService';
import { useGetCourses } from '@/lib/queries/courseHooks';
import {
  LayoutDashboard, BookOpen, Calendar, GraduationCap, ClipboardList,
  CalendarCheck, MapPin, Ticket, Users, Briefcase, ClipboardCheck,
  MessageSquare, User, Bot, Brain, BarChart3, PanelLeftClose,
  Moon, Sun, Settings, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navGroups: { id: string; title?: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    id: 'academics',
    title: 'Academics',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/courses', label: 'Courses', icon: BookOpen },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/exams', label: 'Exams', icon: ClipboardList },
      { href: '/transcript', label: 'Transcript', icon: GraduationCap },
    ],
  },
  // {
  //   id: 'campus',
  //   title: 'Campus & Services',
  //   items: [
  //     { href: '/messages', label: 'Messages', icon: MessageSquare },
  //     { href: '/bookings', label: 'Bookings', icon: CalendarCheck },
  //     { href: '/places', label: 'Campus Map', icon: MapPin },
  //     { href: '/services', label: 'Services', icon: Briefcase },
  //     { href: '/tickets', label: 'Tickets', icon: Ticket },
  //   ],
  // },
  // {
  //   id: 'directory',
  //   title: 'Directory & Account',
  //   items: [
  //     { href: '/people', label: 'People', icon: Users },
  //     { href: '/surveys', label: 'Surveys', icon: ClipboardCheck },
  //   ],
  // },
  // {
  //   id: 'ai',
  //   title: 'AI Features',
  //   items: [
  //     { href: '/ai/chatbot', label: 'AI Assistant', icon: Bot },
  //     { href: '/ai/study-planner', label: 'Study Planner', icon: Brain },
  //     { href: '/ai/analytics', label: 'Analytics', icon: BarChart3 },
  //   ],
  // }
];

function SidebarItemContent({ icon: Icon, label, isActive, isCollapsed }: { icon: React.ElementType, label: string, isActive?: boolean, isCollapsed?: boolean }) {
  return (
    <div className={cn(
      "flex items-center rounded-lg transition-[width,padding,margin] duration-200 cursor-pointer overflow-hidden relative",
      isCollapsed ? "justify-center w-10 px-0 h-10 ml-3 py-0" : "px-3 py-2.5 w-full gap-3",
      isActive
        ? 'bg-primary/10 text-primary'
        : 'hover:bg-muted text-foreground'
    )}>
      <span className={cn("shrink-0 flex items-center justify-center", isActive ? 'text-primary' : '')}>
        <Icon className="h-4 w-4" />
      </span>

      <span className={cn(
        "whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out",
        isCollapsed ? "max-w-0 opacity-0 border-none" : "max-w-[200px] opacity-100",
        isActive ? 'text-primary font-medium' : ''
      )}>
        {label}
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: courses = [] } = useGetCourses();
  const { theme, setTheme } = useTheme();
  
  const { 
    focusMode, 
    sidebar: { isCollapsed, openGroups }, 
    toggleSidebar, 
    toggleSidebarGroup 
  } = useToolkitStore();

  const [logoGif, setLogoGif] = useState<string | null>(null);

  const courseSubItems = useMemo(() => {
    const list = Array.isArray(courses) ? (courses as any[]) : [];
    return list
      .map((course: any, index: number) => {
        const courseId = course.id ?? course.code ?? course.courseId;
        if (!courseId) return null;
        return {
          href: `/courses/${courseId}`,
          label: course.name ?? course.shortcode ?? `Course ${index + 1}`,
          code: course.shortcode ?? course.code,
        };
      })
      .filter(Boolean) as { href: string; label: string; code?: string }[];
  }, [courses]);

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    toggleSidebarGroup(id);
  };

  const fetchLogoGif = async (category: string) => {
    const gif = await giphyService.getRandomGif(category);
    if (gif) setLogoGif(gif);
  };

  useEffect(() => {
    fetchLogoGif('study');
  }, []);

  const isDark = theme === 'dark';

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "border-r border-border bg-card hidden lg:flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden h-screen sticky top-0 shrink-0 z-30",
          focusMode.isActive ? 'w-0 border-0' : isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header with Logo and Collapse Button */}
        <div className={cn(
          "h-[53px] border-b border-border flex items-center shrink-0 transition-[padding] duration-300",
          isCollapsed ? 'justify-center' : 'justify-between px-2.5'
        )}>
          <div className={cn(
            "flex items-center gap-3 overflow-hidden transition-[width,opacity,padding,margin] duration-300",
            isCollapsed ? "w-0 opacity-0 p-0" : "w-auto opacity-100 flex-1 mr-2"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 min-w-0 cursor-pointer group select-none">
                  {/* GIF logo intentionally disabled for now; keep block for future reuse. */}
                  {/* <div className="bg-primary/10 text-primary-foreground rounded-xl p-0 overflow-hidden shrink-0 w-12 h-12 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-all shadow-sm group-hover:shadow-md group-hover:scale-105">
                    {logoGif ? (
                      <img src={logoGif} alt="App Logo" className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="h-6 w-6 text-primary" />
                    )}
                  </div> */}
                  <div className="flex flex-col truncate">
                    <h1 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">Better Polito</h1>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Change Logo Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => fetchLogoGif('study')} className="cursor-pointer">📚 Study Vibes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fetchLogoGif('university aesthetic')} className="cursor-pointer">🎓 University Life</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fetchLogoGif('student')} className="cursor-pointer">🎒 Student Life</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fetchLogoGif('cats')} className="cursor-pointer">🐱 Cute Cats</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fetchLogoGif('coffee aesthetic')} className="cursor-pointer">☕ Coffee Break</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center justify-center rounded-lg transition-[width,height] hover:bg-muted text-foreground cursor-pointer shrink-0 z-20",
                  isCollapsed ? "w-8 h-8" : "w-8 h-8"
                )}
              >
                <PanelLeftClose className={cn("h-4 w-4", isCollapsed && "rotate-180")} />
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right" className="font-normal">Expand</TooltipContent>}
          </Tooltip>
        </div>

        {/* Navigation - Scrollable */}
        <div className={cn("flex-1 overflow-hidden py-4 transition-[padding] duration-300", isCollapsed ? 'px-0' : 'px-2')}>
          <ScrollArea className="h-full">
            {navGroups.map((group) => {
              const isOpen = isCollapsed ? true : !!openGroups[group.id];
              return (
                <div key={group.id} className="mb-4">
                  <button
                    onClick={(e) => !isCollapsed && toggleGroup(group.id, e)}
                    disabled={isCollapsed}
                    className={cn(
                      "flex items-center justify-between w-full text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap overflow-hidden transition-[height,opacity,padding,margin] duration-300",
                      isCollapsed ? "h-0 w-0 opacity-0 p-0 m-0" : "h-4 w-full opacity-100 px-3 mb-2 cursor-pointer hover:text-foreground"
                    )}
                  >
                    {group?.title && <span>{group?.title}</span>}
                    {!isCollapsed && (
                      <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-200", !isOpen && "-rotate-90")} />
                    )}
                  </button>

                  <div className={cn(
                    "space-y-1 overflow-hidden transition-all duration-300",
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  )}>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const isCoursesItem = item.href === '/courses';
                      const shownCourseSubItems = courseSubItems.slice(0, 8);
                      const hasMoreCourses = courseSubItems.length > shownCourseSubItems.length;

                      return (
                        <div key={item.href}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={item.href} className={cn("block", isCollapsed ? "w-fit" : "w-full")}>
                                <SidebarItemContent
                                  icon={item.icon}
                                  label={item.label}
                                  isActive={isActive}
                                  isCollapsed={isCollapsed}
                                />
                              </Link>
                            </TooltipTrigger>
                            {isCollapsed && <TooltipContent side="right" className="font-normal">{item.label}</TooltipContent>}
                          </Tooltip>

                          {isCoursesItem && !isCollapsed && shownCourseSubItems.length > 0 && (
                            <div className="ml-5 mt-1 mb-1 space-y-0.5 pr-1">
                              {shownCourseSubItems.map((course) => {
                                const isCourseActive = pathname === course.href || pathname.startsWith(`${course.href}/`);

                                return (
                                  <Link
                                    key={course.href}
                                    href={course.href}
                                    className={cn(
                                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                                      isCourseActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                  >
                                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isCourseActive ? 'bg-primary' : 'bg-muted-foreground/40')} />
                                    <span className="truncate">{course.label}</span>
                                    {course.code && <span className="ml-auto text-[10px] font-mono text-muted-foreground/70 shrink-0">{course.code}</span>}
                                  </Link>
                                );
                              })}

                              {hasMoreCourses && (
                                <Link href="/courses" className="block px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                                  View all courses ({courseSubItems.length})
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            })}
          </ScrollArea>
        </div>

        {/* Bottom Section */}
        <div className={cn("shrink-0 border-t border-border py-4 transition-[padding] duration-300", isCollapsed ? 'px-0' : 'px-2')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/profile" className={cn("block", isCollapsed ? "w-fit" : "w-full")}>
                <SidebarItemContent
                  icon={User}
                  label="Profile"
                  isActive={pathname === '/profile'}
                  isCollapsed={isCollapsed}
                />
              </Link>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right" className="font-normal">Profile</TooltipContent>}
          </Tooltip>

          {/* Dark Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={cn("block", isCollapsed ? "w-fit" : "w-full")}>
                <SidebarItemContent
                  icon={isDark ? Sun : Moon}
                  label={isDark ? 'Light Mode' : 'Dark Mode'}
                  isCollapsed={isCollapsed}
                />
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right" className="font-normal">{isDark ? 'Light Mode' : 'Dark Mode'}</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
