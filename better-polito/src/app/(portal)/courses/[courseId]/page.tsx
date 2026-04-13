'use client';
import { useGetCourse, useGetCourseFiles, useGetCourseNotices } from '@/lib/queries/courseHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Bell, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

interface Props { params: Promise<{ courseId: string }> }

export default function CourseDetailPage({ params }: Props) {
  const { courseId } = use(params);
  const id = parseInt(courseId);
  const { data: course, isLoading } = useGetCourse(id);
  const { data: notices = [] } = useGetCourseNotices(id);

  const courseData = course as any;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/courses"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        {isLoading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <div>
            <h1 className="text-2xl font-light text-black">{courseData?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{courseData?.shortcode}</Badge>
              {courseData?.credits && <span className="text-xs text-[#777169]">{courseData.credits} credits</span>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notices</CardTitle></CardHeader>
          <CardContent>
            {(notices as any[]).length === 0 ? (
              <p className="text-sm text-[#777169]">No notices.</p>
            ) : (
              <div className="space-y-2">
                {(notices as any[]).slice(0, 5).map((n: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-[#f5f5f5]">
                    <p className="text-sm font-medium text-black">{n.title}</p>
                    <p className="text-xs text-[#777169] mt-1">{n.content?.slice(0, 100)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Files</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[#777169]">
              View course files in the Files tab.
            </p>
            <Button variant="stone" size="sm" className="mt-3" asChild>
              <Link href={`/courses/${courseId}/files`}>Browse Files</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {courseData?.description && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" /> Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[#4e4e4e] leading-relaxed">{courseData.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
