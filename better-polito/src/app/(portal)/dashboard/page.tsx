'use client';
import { useGetStudent } from '@/lib/queries/studentHooks';
import { useGetExams } from '@/lib/queries/examHooks';
import { useGetGrades } from '@/lib/queries/studentHooks';
import { useGetMessages } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatThirtiethsGrade } from '@/lib/utils/grades';
import {
  GraduationCap, CalendarCheck, MessageSquare, BookOpen,
  ClipboardList, Bot, ChevronRight, TrendingUp
} from 'lucide-react';
import Link from 'next/link';

function StatCard({
  label, value, icon: Icon, href, color = 'default'
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  color?: 'default' | 'warm';
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow duration-200 cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#777169] font-medium mb-1">{label}</p>
              <p className="text-3xl font-light text-black">{value}</p>
            </div>
            <div className={`p-2 rounded-xl ${color === 'warm' ? 'bg-[#f5f2ef]' : 'bg-[#f5f5f5]'}`}>
              <Icon className="w-5 h-5 text-[#4e4e4e]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: student, isLoading: studentLoading } = useGetStudent();
  const { data: exams = [], isLoading: examsLoading } = useGetExams();
  const { data: grades = [], isLoading: gradesLoading } = useGetGrades();
  const { data: messages = [], isLoading: messagesLoading } = useGetMessages();

  const studentData = student as any;
  const firstName = studentData?.firstName ?? '';

  const upcomingExams = (exams as any[]).filter(
    (e: any) => e.status === 'available' || e.status === 'booked'
  );

  const recentGrades = (grades as any[]).slice(0, 5);
  const unreadMessages = (messages as any[]).filter((m: any) => !m.isRead).length;

  const avgGrade =
    (grades as any[]).length > 0
      ? (
          (grades as any[]).reduce((acc: number, g: any) => {
            const val = parseFloat(g.grade);
            return isNaN(val) ? acc : acc + val;
          }, 0) / (grades as any[]).filter((g: any) => !isNaN(parseFloat(g.grade))).length
        ).toFixed(1)
      : '—';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        {studentLoading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="text-3xl font-light text-black">
            {firstName ? `Welcome, ${firstName}` : 'Dashboard'}
          </h1>
        )}
        <p className="text-sm text-[#777169] mt-1">
          Here&apos;s what&apos;s happening with your studies.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {examsLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard label="Upcoming Exams" value={upcomingExams.length} icon={ClipboardList} href="/exams" />
            <StatCard label="Unread Messages" value={unreadMessages} icon={MessageSquare} href="/messages" color="warm" />
            <StatCard label="Average Grade" value={avgGrade} icon={TrendingUp} href="/transcript" />
            <StatCard label="Courses" value={(grades as any[]).length} icon={BookOpen} href="/courses" color="warm" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming exams */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Upcoming Exams</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/exams" className="text-xs text-[#777169] flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {examsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : upcomingExams.length === 0 ? (
              <div className="py-6 text-center">
                <CalendarCheck className="w-8 h-8 text-[#e5e5e5] mx-auto mb-2" />
                <p className="text-sm text-[#777169]">No upcoming exams</p>
              </div>
            ) : (
              upcomingExams.slice(0, 4).map((exam: any) => (
                <div
                  key={exam.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-[#f5f5f5] hover:bg-[#f5f2ef] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black truncate">{exam.courseName}</p>
                    <p className="text-xs text-[#777169] mt-0.5">
                      {exam.examStartsAt
                        ? new Date(exam.examStartsAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : 'Date TBD'}
                    </p>
                  </div>
                  <Badge variant={exam.status === 'booked' ? 'success' : 'secondary'} className="ml-2 shrink-0">
                    {exam.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent grades */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Grades</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transcript" className="text-xs text-[#777169] flex items-center gap-1">
                  Transcript <ChevronRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {gradesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : recentGrades.length === 0 ? (
              <div className="py-6 text-center">
                <GraduationCap className="w-8 h-8 text-[#e5e5e5] mx-auto mb-2" />
                <p className="text-sm text-[#777169]">No grades yet</p>
              </div>
            ) : (
              recentGrades.map((grade: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f5f5f5]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black truncate">{grade.courseName || grade.name}</p>
                    <p className="text-xs text-[#777169] mt-0.5">
                      {grade.date ? new Date(grade.date).toLocaleDateString('en-GB') : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0 font-semibold">
                    {formatThirtiethsGrade(grade.grade)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI panel */}
      <Card className="bg-black text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5" />
                <span className="text-sm font-medium">AI Features</span>
              </div>
              <h3 className="text-xl font-light mb-2">Supercharge your studies</h3>
              <p className="text-sm text-white/60 max-w-md">
                Use the AI Study Planner, chat assistant, and analytics to plan and optimize your academic journey.
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" size="sm" asChild className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-full">
              <Link href="/ai/study-planner">Study Planner</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-full">
              <Link href="/ai/chatbot">AI Chat</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-full">
              <Link href="/ai/analytics">Analytics</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
