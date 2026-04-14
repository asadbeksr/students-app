'use client';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MaterialsTab from '@/components/materials/MaterialsTab';
import { useGetCourse, useGetCourseNotices } from '@/lib/queries/courseHooks';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, MessageCircle, ChevronDown, BookOpen, GraduationCap, CalendarDays, Mail } from 'lucide-react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import ChatWindow from '@/components/chat/ChatWindow';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePanelRef } from 'react-resizable-panels';

const CHAT_SNAPS = [33, 50];
const SNAP_THRESHOLD = 6;

function useSnapOnRelease(panelRef: ReturnType<typeof usePanelRef>, snaps: number[]) {
  const sizeRef = useRef(0);
  const onResize = (size: { asPercentage: number }) => { sizeRef.current = size.asPercentage ?? 0; };
  useEffect(() => {
    const snap = () => {
      const pct = sizeRef.current;
      if (!pct) return;
      const nearest = snaps.reduce((a, b) => Math.abs(b - pct) < Math.abs(a - pct) ? b : a);
      if (Math.abs(nearest - pct) > SNAP_THRESHOLD || Math.abs(nearest - pct) < 0.5) return;
      panelRef.current?.resize(`${nearest}%`);
    };
    document.addEventListener('pointerup', snap);
    return () => document.removeEventListener('pointerup', snap);
  }, [panelRef, snaps]);
  return onResize;
}

/* ── Academic year selector ─────────────────────────────────────── */
const ACADEMIC_YEARS = ['2026/27', '2025/26', '2024/25', '2023/24', '2022/23'];

function AcademicYearSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-muted/50 border border-border/60 text-xs font-medium text-foreground rounded-full pl-3 pr-7 py-1.5 cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {ACADEMIC_YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}

/* ── Notices sheet ──────────────────────────────────────────────── */
function NoticesSheet({ notices }: { notices: any[] }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2 border-border/40 hover:bg-muted/50 text-muted-foreground shadow-sm">
          <Bell className="w-4 h-4 text-foreground/80" />
          <span className="font-medium text-foreground/80 hidden sm:inline-block">Notices</span>
          {notices.length > 0 && (
            <Badge variant="outline" className="px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary pointer-events-none">
              {notices.length}
            </Badge>
          )}
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
                <X className="w-4 h-4" /><span className="sr-only">Close</span>
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
            {notices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p>No notices available.</p>
              </div>
            ) : notices.map((n: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/40 transition-colors">
                {n.title && <h4 className="text-sm font-semibold text-foreground mb-2 leading-tight">{n.title}</h4>}
                <div
                  className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_p]:my-1.5 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: n.content ?? '' }}
                />
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const id = parseInt(courseId);
  const { data: course, isLoading } = useGetCourse(id);
  const { data: notices = [] } = useGetCourseNotices(id);
  const { focusMode } = useToolkitStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025/26');
  const chatRef = usePanelRef();
  const chatOnResize = useSnapOnRelease(chatRef, CHAT_SNAPS);

  useEffect(() => {
    const onExternalToggle = () => setIsChatOpen((prev) => !prev);
    window.addEventListener('course-ai-assistant-toggle', onExternalToggle);
    return () => window.removeEventListener('course-ai-assistant-toggle', onExternalToggle);
  }, []);

  const c = course as any;

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[2px] w-24 bg-primary/30 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-primary/70 rounded-full" style={{ animation: 'loading-bar 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center">
        <p className="text-muted-foreground font-medium">Course not found</p>
        <Button variant="outline" asChild><Link href="/courses">Back to courses</Link></Button>
      </div>
    );
  }

  const staff: any[] = c.staff ?? [];
  const teachers = staff.filter((s) => !s.role || s.role.toLowerCase().includes('tit') || s.role.toLowerCase().includes('teacher') || s.role.toLowerCase().includes('docente'));
  const collaborators = staff.filter((s) => s.role && (s.role.toLowerCase().includes('col') || s.role.toLowerCase().includes('assist')));
  const displayStaff = teachers.length > 0 ? teachers : staff;

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────── */}
      {!focusMode.isActive && (
        <div className="bg-card border-b border-border shrink-0">
          <div className="px-4 md:px-6 py-2.5 flex items-start gap-4">
            {/* Course info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold text-foreground truncate leading-tight">{c.name}</h1>
                {c.credits && (
                  <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                    {c.credits} CFU
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">{c.shortcode}</span>
                {c.period && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />Period {c.period}
                  </span>
                )}
                {c.courseType && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />{c.courseType}
                  </span>
                )}
                {displayStaff.slice(0, 3).map((s: any, i: number) => {
                  const name = s.name ?? [s.firstName, s.lastName].filter(Boolean).join(' ');
                  return (
                    <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[160px]">{name}</span>
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="hover:text-foreground transition-colors">
                          <Mail className="h-3 w-3" />
                        </a>
                      )}
                    </span>
                  );
                })}
                {collaborators.length > 0 && (
                  <span className="text-xs text-muted-foreground/60">+{collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <AcademicYearSelect value={academicYear} onChange={setAcademicYear} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`rounded-full gap-2 shadow-sm transition-colors ${
                  isChatOpen
                    ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50'
                    : 'border-border/40 hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium hidden sm:inline-block">AI Assistant</span>
              </Button>
              <NoticesSheet notices={notices as any[]} />
            </div>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={isChatOpen ? "65%" : "100%"} className="flex flex-col min-w-0 h-full">
            <MaterialsTab courseId={courseId} year={academicYear} />
          </ResizablePanel>

          {isChatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize="35%"
                minSize="280px"
                panelRef={chatRef}
                onResize={chatOnResize}
                className="flex flex-col border-l border-border bg-background"
              >
                <ChatWindow courseId={courseId} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
