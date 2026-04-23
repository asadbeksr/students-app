'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { X, User, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { NAV_GROUPS } from '@/config/navigation';
import { useGetCourses } from '@/lib/queries/courseHooks';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: courses = [] } = useGetCourses();

  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const courseSubItems = useMemo(() => {
    const list = Array.isArray(courses) ? (courses as any[]) : [];
    return list
      .map((course: any, i: number) => {
        const courseId = course.id ?? course.code ?? course.courseId;
        if (!courseId) return null;
        return {
          href: `/courses/${courseId}`,
          label: course.name ?? course.shortcode ?? `Course ${i + 1}`,
          code: course.shortcode ?? course.code,
        };
      })
      .filter(Boolean) as { href: string; label: string; code?: string }[];
  }, [courses]);

  if (!open) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-[53px] flex items-center justify-between px-4 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground">Polito Community Portal</h1>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="px-3 mb-2 text-xs text-muted-foreground uppercase tracking-wider">{group.title}</p>
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  const isCoursesItem = href === '/courses';
                  const shownCourseSubItems = courseSubItems.slice(0, 8);

                  return (
                    <div key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? 'text-primary' : 'text-muted-foreground')} />
                        {label}
                      </Link>

                      {isCoursesItem && shownCourseSubItems.length > 0 && (
                        <div className="ml-5 mt-1 space-y-0.5 pr-1">
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-border py-4 px-2 space-y-1">
          <Link
            href="/profile"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/profile' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
            )}
          >
            <User className={cn("w-4 h-4 shrink-0", pathname === '/profile' ? 'text-primary' : 'text-muted-foreground')} />
            Profile
          </Link>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 shrink-0 text-muted-foreground" /> : <Moon className="w-4 h-4 shrink-0 text-muted-foreground" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </div>
  );
}
