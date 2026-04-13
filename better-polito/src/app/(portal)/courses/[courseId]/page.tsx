'use client';
import { useState } from 'react';
import MaterialsTab from '@/components/materials/MaterialsTab';
import { useGetCourse, useGetCourseNotices, useGetCourseVirtualClassrooms } from '@/lib/queries/courseHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, BookOpen, ChevronRight, X, MessageCircle, CalendarDays, FileQuestion, User, Mail, Monitor, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CourseHeader from '@/components/layout/CourseHeader';
import ChatWindow from '@/components/chat/ChatWindow';
import StudyPlanView from '@/components/studyplan/StudyPlanView';
import ExamList from '@/components/exam/ExamList';

function NoticesSheet({ notices }: { notices: any[] }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2 border-border/40 hover:bg-muted/50 text-muted-foreground shadow-sm">
          <Bell className="w-4 h-4 text-foreground/80" />
          <span className="font-medium text-foreground/80 hidden sm:inline-block">Notices</span>
          <Badge variant="outline" className="px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 pointer-events-none">
            {notices.length}
          </Badge>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-[100dvh] w-full max-w-sm sm:max-w-md bg-background border-l border-border shadow-2xl p-6 sm:p-8 flex flex-col gap-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 transition-all">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-medium tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Course Notices
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </Dialog.Close>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 scrollbar-thin">
            {notices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p>No notices available.</p>
              </div>
            ) : (
              notices.map((n: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/40 transition-colors">
                  {n.title && (
                    <h4 className="text-sm font-semibold text-foreground mb-2 leading-tight">{n.title}</h4>
                  )}
                  <div
                    className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_p]:my-1.5 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: n.content ?? '' }}
                  />
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


// File Explorer Component
interface Props { params: { courseId: string } }

export default function CourseDetailPage({ params }: Props) {
  const { courseId } = params;
  const id = parseInt(courseId);
  const { data: course, isLoading } = useGetCourse(id);
  const { data: notices = [] } = useGetCourseNotices(id);
  const { data: virtualClassrooms = [] } = useGetCourseVirtualClassrooms(id);

  const [activeTab, setActiveTab] = useState('materials');

  const courseData = course as any;
  const staff: any[] = courseData?.staff ?? [];
  const vcRooms = virtualClassrooms as any[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground animate-pulse font-medium">Loading course...</p>
      </div>
    );
  }

  // Fallback to empty if not found
  if (!courseData) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground font-medium">Course not found</p>
        <Button variant="outline" asChild><Link href="/courses">Back to courses</Link></Button>
      </div>
    );
  }

  return (
    <div className="h-full -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 flex flex-col bg-background">
      <Tabs defaultValue="materials" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden md:block shrink-0">
          <CourseHeader
            title={courseData.name}
            subtitle={courseData.credits ? `${courseData.shortcode} • ${courseData.credits} credits` : courseData.shortcode}
            action={
              <div className="flex items-center gap-3">
                 <NoticesSheet notices={notices as any[]} />
              </div>
            }
            metadata={
              <>
                {staff.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {staff.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{s.name ?? [s.firstName, s.lastName].filter(Boolean).join(' ')}</span>
                        {s.role && <Badge variant="outline" className="text-[10px] px-1.5">{s.role}</Badge>}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="hover:text-foreground transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!staff.length && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm font-medium">{courseData?.period ? `Period ${courseData.period}` : 'Active Semester'}</span>
                  </div>
                )}
              </>
            }
            tabs={
              <TabsList className="h-9 bg-transparent p-0 gap-1">
                <TabsTrigger value="materials" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20"> 
                  <BookOpen className="h-3.5 w-3.5" />
                  Materials
                </TabsTrigger>
                {vcRooms.length > 0 && (
                  <TabsTrigger value="virtual" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20">
                    <Monitor className="h-3.5 w-3.5" />
                    Virtual
                  </TabsTrigger>
                )}
                <TabsTrigger value="chat" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <MessageCircle className="h-3.5 w-3.5" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="study-plan" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Study Plan
                </TabsTrigger>
                <TabsTrigger value="exams" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <FileQuestion className="h-3.5 w-3.5" />
                  Mock Exams
                </TabsTrigger>
              </TabsList>
            }
          />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0 h-8 w-8 hover:bg-muted/50">
              <Link href="/courses"><ArrowLeft className="w-5 h-5 text-foreground/80" /></Link>
            </Button>
            <div className="flex-1 min-w-0 pr-2">
              <h1 className="text-sm font-semibold truncate leading-tight">{courseData.name}</h1>
              <p className="text-[11px] font-medium text-muted-foreground truncate">{courseData.credits ? `${courseData.shortcode} • ${courseData.credits} credits` : courseData.shortcode}</p>
            </div>
          </div>
          <div className="shrink-0">
            <NoticesSheet notices={notices as any[]} />
          </div>
        </div>

        {/* Tab Contents */}
        <TabsContent value="materials" className="flex-1 m-0 overflow-hidden flex flex-col">
          <MaterialsTab courseId={courseId} />
        </TabsContent>

        {/* Virtual Classrooms Tab */}
        <TabsContent value="virtual" className="flex-1 m-0 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-sm text-muted-foreground mb-4">Live and recorded virtual classroom sessions.</p>
            {vcRooms.length === 0 ? (
              <div className="py-12 text-center">
                <Monitor className="w-8 h-8 text-border mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No virtual classrooms available.</p>
              </div>
            ) : vcRooms.map((vc: any, i: number) => (
              <Card key={vc.id ?? i}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{vc.title ?? vc.name ?? `Session ${i + 1}`}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {vc.startsAt && <span>{new Date(vc.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {vc.provider && <Badge variant="secondary" className="text-[10px]">{vc.provider}</Badge>}
                      {vc.isRecorded && <Badge variant="outline" className="text-[10px]">Recorded</Badge>}
                    </div>
                  </div>
                  {(vc.url ?? vc.joinUrl ?? vc.link) && (
                    <Button size="sm" asChild>
                      <a href={vc.url ?? vc.joinUrl ?? vc.link} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1.5" /> Join
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="chat" className="flex-1 m-0 overflow-y-auto pb-24 md:pb-0 relative">
          <ChatWindow courseId={params.courseId} />
        </TabsContent>
        
        <TabsContent value="study-plan" className="flex-1 m-0 overflow-y-auto pb-24 md:pb-0 relative">
          <StudyPlanView courseId={params.courseId} />
        </TabsContent>
        
        <TabsContent value="exams" className="flex-1 m-0 overflow-y-auto pb-24 md:pb-0 relative">
          <ExamList courseId={params.courseId} onStartExam={(id) => console.log('start', id)} />
        </TabsContent>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card safe-area-bottom z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="w-full h-[64px] flex">
            <TabsList className="flex-1 h-full bg-transparent p-0 grid grid-cols-4 rounded-none">
              <TabsTrigger 
                value="materials" 
                className="flex-col gap-1 h-full data-[state=active]:bg-primary/10 rounded-none border-t-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground/80 pb-safe shadow-none active:scale-95 transition-transform"
              >
                <BookOpen className="h-5 w-5" />
                <span className="text-[10px]">Materials</span>
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="flex-col gap-1 h-full data-[state=active]:bg-primary/10 rounded-none border-t-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground/80 pb-safe shadow-none active:scale-95 transition-transform"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-[10px]">Chat</span>
              </TabsTrigger>
              <TabsTrigger 
                value="study-plan" 
                className="flex-col gap-1 h-full data-[state=active]:bg-primary/10 rounded-none border-t-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground/80 pb-safe shadow-none active:scale-95 transition-transform"
              >
                <CalendarDays className="h-5 w-5" />
                <span className="text-[10px]">Plan</span>
              </TabsTrigger>
              <TabsTrigger 
                value="exams" 
                className="flex-col gap-1 h-full data-[state=active]:bg-primary/10 rounded-none border-t-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground/80 pb-safe shadow-none active:scale-95 transition-transform"
              >
                <FileQuestion className="h-5 w-5" />
                <span className="text-[10px]">Exams</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
