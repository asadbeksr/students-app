'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { PanelLeftClose, Moon, Sun, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_GROUPS } from '@/config/navigation';

function SidebarItemContent({ icon: Icon, label, isActive, isCollapsed }: { icon: React.ElementType, label: string, isActive?: boolean, isCollapsed?: boolean }) {
  return (
    <div className={cn(
      "flex items-center rounded-lg transition-[width,padding,margin] duration-200 cursor-pointer overflow-hidden relative",
      isCollapsed ? "justify-center w-10 px-0 h-10 ml-3 py-0" : "px-3 py-2.5 w-full gap-3",
      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
    )}>
      <span className={cn("shrink-0 flex items-center justify-center", isActive ? 'text-primary' : '')}>
        <Icon className="h-4 w-4" />
      </span>
      <span className={cn(
        "whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out",
        isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
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

  const { focusMode, sidebar: { isCollapsed, openGroups }, toggleSidebar, toggleSidebarGroup } = useToolkitStore();

  const [tooltipsEnabled, setTooltipsEnabled] = useState(false);
  useEffect(() => {
    setTooltipsEnabled(false);
    const id = setTimeout(() => setTooltipsEnabled(true), 320);
    return () => clearTimeout(id);
  }, [isCollapsed]);

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

  const isDark = theme === 'dark';

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "border-r border-border bg-card hidden lg:flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden h-screen sticky top-0 shrink-0 z-30",
        focusMode.isActive ? 'w-0 border-0' : isCollapsed ? 'w-16' : 'w-64'
      )}>
        {/* Header */}
        <div className={cn(
          "h-[53px] border-b border-border flex items-center shrink-0 transition-[padding] duration-300",
          isCollapsed ? 'justify-center' : 'justify-between px-2.5'
        )}>
          <div className={cn(
            "flex items-center overflow-hidden transition-[width,opacity] duration-300",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 flex-1 mr-2 pl-1"
          )}>
            <h1 className="text-base font-semibold text-foreground truncate">Polito Community Portal</h1>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-foreground cursor-pointer shrink-0"
              >
                <PanelLeftClose className={cn("h-4 w-4", isCollapsed && "rotate-180")} />
              </button>
            </TooltipTrigger>
            {isCollapsed && tooltipsEnabled && <TooltipContent side="right" className="font-normal">Expand</TooltipContent>}
          </Tooltip>
        </div>

        {/* Navigation */}
        <div className={cn("flex-1 overflow-hidden py-4 transition-[padding] duration-300", isCollapsed ? 'px-0' : 'px-2')}>
          <ScrollArea className="h-full">
            {NAV_GROUPS.map((group) => {
              const isOpen = isCollapsed ? true : !!openGroups[group.id];
              return (
                <div key={group.id} className="mb-4">
                  <button
                    onClick={(e) => { if (!isCollapsed) { e.preventDefault(); toggleSidebarGroup(group.id); } }}
                    disabled={isCollapsed}
                    className={cn(
                      "flex items-center justify-between w-full text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap overflow-hidden transition-[height,opacity,padding,margin] duration-300",
                      isCollapsed ? "h-0 w-0 opacity-0 p-0 m-0" : "h-4 w-full opacity-100 px-3 mb-2 cursor-pointer hover:text-foreground"
                    )}
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-200", !isOpen && "-rotate-90")} />
                  </button>

                  <div className={cn(
                    "space-y-1 overflow-hidden transition-all duration-300",
                    isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
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
                                <SidebarItemContent icon={item.icon} label={item.label} isActive={isActive} isCollapsed={isCollapsed} />
                              </Link>
                            </TooltipTrigger>
                            {isCollapsed && tooltipsEnabled && <TooltipContent side="right" className="font-normal">{item.label}</TooltipContent>}
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
                                      isCourseActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
              );
            })}
          </ScrollArea>
        </div>

        {/* Bottom */}
        <div className={cn("shrink-0 border-t border-border py-4 transition-[padding] duration-300", isCollapsed ? 'px-0' : 'px-2')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/profile" className={cn("block", isCollapsed ? "w-fit" : "w-full")}>
                <SidebarItemContent icon={User} label="Profile" isActive={pathname === '/profile'} isCollapsed={isCollapsed} />
              </Link>
            </TooltipTrigger>
            {isCollapsed && tooltipsEnabled && <TooltipContent side="right" className="font-normal">Profile</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={cn("block", isCollapsed ? "w-fit" : "w-full")}>
                <SidebarItemContent icon={isDark ? Sun : Moon} label={isDark ? 'Light Mode' : 'Dark Mode'} isCollapsed={isCollapsed} />
              </button>
            </TooltipTrigger>
            {isCollapsed && tooltipsEnabled && <TooltipContent side="right" className="font-normal">{isDark ? 'Light Mode' : 'Dark Mode'}</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
