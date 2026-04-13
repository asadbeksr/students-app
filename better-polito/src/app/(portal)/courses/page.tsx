'use client';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { BookOpen, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function CoursesPage() {
  const { data: courses = [], isLoading } = useGetCourses();
  const [search, setSearch] = useState('');

  const filtered = (courses as any[]).filter((c: any) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.shortcode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-light text-black">Courses</h1>
        <p className="text-sm text-[#777169] mt-1">Your enrolled courses this semester.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777169]" />
        <Input
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BookOpen className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
          <p className="text-[#777169]">{search ? 'No courses match your search.' : 'No courses found.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course: any) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-[#4e4e4e]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-black truncate">{course.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{course.shortcode}</Badge>
                        {course.credits && (
                          <span className="text-xs text-[#777169]">{course.credits} credits</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#777169] shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
