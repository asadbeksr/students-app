'use client';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { BookOpen, ChevronRight, Search, Monitor, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Per-course color dot based on id
function courseColor(id: number | string, color?: string): string {
  if (color) return color;
  const palette = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];
  return palette[Number(id) % palette.length];
}

const PERIOD_LABELS: Record<string, string> = {
  '1': '1st Sem', '2': '2nd Sem', 'A': 'Annual', '1A': 'Q1', '1B': 'Q2', '2A': 'Q3', '2B': 'Q4',
};

export default function CoursesPage() {
  const { data: courses = [], isLoading } = useGetCourses();
  const [search, setSearch] = useState('');

  const filtered = (courses as any[]).filter((c: any) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.shortcode?.toLowerCase().includes(search.toLowerCase()) ||
    (c.staff ?? []).some((s: any) => s.name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search courses or teachers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BookOpen className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-muted-foreground">{search ? 'No courses match your search.' : 'No courses found.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course: any) => {
            const dot = courseColor(course.id, course.color);
            const period = course.period ?? course.semester;
            const year = course.year ?? course.courseYear;
            const isOnline = course.isOnline ?? course.teachingMode === 'online';
            const teachers = (course.staff ?? []).slice(0, 2).map((s: any) => s.name ?? s.firstName).filter(Boolean);

            return (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Color dot */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${dot}22`, border: `2px solid ${dot}44` }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dot }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{course.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">{course.shortcode}</Badge>
                        {course.credits && <span className="text-xs text-muted-foreground">{course.credits} cr</span>}
                        {period && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{PERIOD_LABELS[period] ?? period}</Badge>}
                        {year && <span className="text-xs text-muted-foreground">Yr {year}</span>}
                        {isOnline && (
                          <span className="text-xs text-blue-600 flex items-center gap-0.5">
                            <Monitor className="w-3 h-3" /> Online
                          </span>
                        )}
                      </div>
                      {teachers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          {teachers.join(', ')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
