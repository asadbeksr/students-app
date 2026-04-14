'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGetStudent, useGetGrades, useGetMessages, useGetLectures } from '@/lib/queries/studentHooks';
import { useGetExams } from '@/lib/queries/examHooks';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatThirtiethsGrade } from '@/lib/utils/grades';
import {
  Clock, MapPin, Sparkles, GripVertical, EyeOff, Eye,
  LayoutGrid, Check, ChevronRight, CalendarCheck,
  MessageSquare, ClipboardList, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

// ─── types ───────────────────────────────────────────────────────────────────

type WidgetId = 'classes' | 'courses' | 'messages' | 'exams' | 'grades' | 'ai';
type ColSpan = 1 | 2 | 3;

interface LayoutState {
  order: WidgetId[];
  spans: Record<WidgetId, ColSpan>;
  hidden: WidgetId[];
}

// ─── constants ───────────────────────────────────────────────────────────────

const WIDGET_META: Record<WidgetId, { label: string; accent: string }> = {
  classes:  { label: "Today's Classes", accent: '#424AFB' },
  courses:  { label: 'Courses',         accent: '#3B82F6' },
  messages: { label: 'Messages',        accent: '#9D72FF' },
  exams:    { label: 'Upcoming Exams',  accent: '#FF6B8B' },
  grades:   { label: 'Grades',          accent: '#34C759' },
  ai:       { label: 'AI Assistant',    accent: '#FF8C42' },
};

const DEFAULT_LAYOUT: LayoutState = {
  order: ['classes', 'courses', 'messages', 'exams', 'grades', 'ai'],
  spans: { classes: 2, courses: 1, messages: 1, exams: 1, grades: 1, ai: 1 },
  hidden: [],
};

const STORAGE_KEY = 'better-polito:dashboard-layout-v2';

// ─── helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── widget shell ─────────────────────────────────────────────────────────────

function Widget({ id, label, href, children, isEditing }: {
  id: WidgetId; label: string; href?: string;
  children: React.ReactNode; isEditing?: boolean;
}) {
  const { accent } = WIDGET_META[id];
  return (
    <div
      className={cn('glass rounded-3xl p-5 flex flex-col gap-4 h-full',
        isEditing && 'ring-2 ring-offset-2 ring-offset-background')}
      style={isEditing ? { '--tw-ring-color': `${accent}55` } as React.CSSProperties : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{label}</span>
        </div>
        {href && !isEditing && (
          <Link href={href} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── sortable + resizable wrapper ─────────────────────────────────────────────

function SortableWidget({ id, span, isEditing, onSpanChange, onHide, children }: {
  id: WidgetId; span: ColSpan; isEditing: boolean;
  onSpanChange: (s: ColSpan) => void; onHide: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, gridColumn: `span ${span} / span ${span}` }}
      className={cn('relative flex flex-col', isDragging && 'opacity-40')}
    >
      {/* drag handle — top-right */}
      {isEditing && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
          <button onClick={onHide} title="Hide"
            className="glass-ctrl w-7 h-7 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity shadow-arc-sticker">
            <EyeOff className="w-3.5 h-3.5 text-foreground/60" />
          </button>
          <button {...attributes} {...listeners} title="Drag to reorder"
            className="glass-ctrl w-7 h-7 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity shadow-arc-sticker">
            <GripVertical className="w-3.5 h-3.5 text-foreground/60" />
          </button>
        </div>
      )}

      <div className="flex-1">{children}</div>

      {/* resize bar — bottom */}
      {isEditing && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {([1, 2, 3] as ColSpan[]).map(s => (
            <button
              key={s}
              onClick={() => onSpanChange(s)}
              title={`${s} column${s > 1 ? 's' : ''}`}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all',
                span === s
                  ? 'bg-foreground text-background shadow-sm'
                  : 'glass-ctrl text-muted-foreground hover:text-foreground',
              )}
            >
              {/* mini column preview */}
              <span className="flex gap-0.5 items-center">
                {Array.from({ length: s }).map((_, i) => (
                  <span key={i} className={cn('h-2.5 w-1.5 rounded-[2px]', span === s ? 'bg-background/80' : 'bg-foreground/30')} />
                ))}
              </span>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── widget contents ──────────────────────────────────────────────────────────

function ClassesContent({ isEditing }: { isEditing?: boolean }) {
  const { data: lectures = [], isLoading } = useGetLectures({ fromDate: todayISO(), toDate: todayISO() });
  const items = (lectures as any[]).slice(0, 4);
  return (
    <Widget id="classes" label="Today's Classes" href="/agenda" isEditing={isEditing}>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <CalendarCheck className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No classes today — enjoy the break!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((l: any, i: number) => (
            <div key={i} className="glass-inner flex items-start gap-3 p-3 rounded-2xl cursor-default">
              <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: `hsl(${(i * 60 + 237) % 360},75%,62%)` }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{l.courseName ?? l.title ?? l.subject}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {(l.startTime ?? l.startsAt) && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />{l.startTime ?? l.startsAt}{(l.endTime ?? l.endsAt) ? `–${l.endTime ?? l.endsAt}` : ''}
                    </span>
                  )}
                  {(l.room ?? l.classRoom ?? l.location) && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{l.room ?? l.classRoom ?? l.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

function MessagesContent({ isEditing }: { isEditing?: boolean }) {
  const { data: messages = [], isLoading } = useGetMessages();
  const unread = (messages as any[]).filter(m => !m.isRead);
  return (
    <Widget id="messages" label="Messages" href="/messages" isEditing={isEditing}>
      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
      ) : unread.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">All caught up!</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{unread.length}</span>
            <span className="text-sm text-muted-foreground">unread</span>
          </div>
          <div className="space-y-1.5">
            {unread.slice(0, 3).map((m: any, i: number) => (
              <div key={i} className="glass-inner p-2.5 rounded-xl">
                <p className="text-xs font-medium text-foreground truncate">{m.subject ?? m.title}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{m.sender ?? m.from}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Widget>
  );
}

function CoursesContent({ isEditing }: { isEditing?: boolean }) {
  const { data: courses = [], isLoading } = useGetCourses();
  const items = (courses as any[]).slice(0, 5);

  return (
    <Widget id="courses" label="Courses" href="/courses" isEditing={isEditing}>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <BookOpen className="w-7 h-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">No courses available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((course: any, index: number) => {
            const courseId = course.id ?? course.code ?? course.courseId;
            const teachers = (course.staff ?? [])
              .slice(0, 2)
              .map((s: any) => s.name ?? s.firstName)
              .filter(Boolean)
              .join(', ');

            return (
              <Link
                key={courseId ?? `${course.name ?? 'course'}-${index}`}
                href={courseId ? `/courses/${courseId}` : '/courses'}
                className="glass-inner block p-3 rounded-2xl hover:opacity-90 transition-opacity"
              >
                <p className="text-sm font-semibold text-foreground truncate">{course.name ?? 'Course'}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs text-muted-foreground truncate font-mono">
                    {course.shortcode ?? course.code ?? 'COURSE'}
                  </span>
                  {course.credits && (
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">{course.credits} cr</Badge>
                  )}
                </div>
                {teachers && <p className="text-[11px] text-muted-foreground truncate mt-1">{teachers}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

function ExamsContent({ isEditing }: { isEditing?: boolean }) {
  const { data: exams = [], isLoading } = useGetExams();
  const upcoming = (exams as any[])
    .filter(e => ['Available','Requestable','Booked','RequestAccepted','Requested'].includes(e.status) && e.examStartsAt)
    .sort((a, b) => new Date(a.examStartsAt).getTime() - new Date(b.examStartsAt).getTime())
    .slice(0, 3);
  return (
    <Widget id="exams" label="Upcoming Exams" href="/exams" isEditing={isEditing}>
      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <ClipboardList className="w-7 h-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">No upcoming exams</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((exam: any) => {
            const days = daysUntil(exam.examStartsAt);
            const urgent = days <= 7;
            const accent = WIDGET_META.exams.accent;
            const blueAccent = WIDGET_META.classes.accent;
            return (
              <div key={exam.id} className="glass-inner p-3 rounded-2xl cursor-default">
                <p className="text-sm font-semibold text-foreground truncate">{exam.courseName}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(exam.examStartsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: urgent ? `${accent}22` : `${blueAccent}18`,
                      color: urgent ? accent : blueAccent,
                    }}>
                    {days <= 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

function GradesContent({ isEditing }: { isEditing?: boolean }) {
  const { data: grades = [], isLoading } = useGetGrades();
  const all = grades as any[];
  const numeric = all.filter(g => !isNaN(parseFloat(g.grade)));
  const avg = numeric.length > 0
    ? (numeric.reduce((s, g) => s + parseFloat(g.grade), 0) / numeric.length).toFixed(1)
    : null;
  return (
    <Widget id="grades" label="Grades" href="/transcript" isEditing={isEditing}>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-2xl" />)}</div>
      ) : (
        <>
          {avg && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{avg}</span>
              <span className="text-sm text-muted-foreground">/ 30 avg</span>
            </div>
          )}
          <div className="space-y-1.5">
            {all.slice(0, 4).map((g: any, i: number) => (
              <div key={i} className="glass-inner flex items-center justify-between p-2.5 rounded-xl">
                <p className="text-xs font-medium text-foreground truncate flex-1 mr-2">{g.courseName ?? g.name}</p>
                <Badge variant="outline" className="text-[11px] font-bold shrink-0">{formatThirtiethsGrade(g.grade)}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </Widget>
  );
}

function AIContent({ isEditing }: { isEditing?: boolean }) {
  return (
    <Widget id="ai" label="AI Assistant" href="/ai/chatbot" isEditing={isEditing}>
      <div className="flex flex-col gap-2.5">
        <div className="glass-inner p-3 rounded-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4" style={{ color: WIDGET_META.ai.accent }} />
            <span className="text-xs font-semibold text-foreground">Ask anything</span>
          </div>
          <p className="text-xs text-muted-foreground">Summarize courses, plan study sessions, or get help with materials.</p>
        </div>
        {[
          { label: '📚 Study Planner', href: '/ai/study-planner' },
          { label: '💬 AI Chat',       href: '/ai/chatbot' },
          { label: '📊 Analytics',     href: '/ai/analytics' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="glass-inner flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-foreground">
            {item.label}
          </Link>
        ))}
      </div>
    </Widget>
  );
}

const WIDGET_CONTENT: Record<WidgetId, (p: { isEditing?: boolean }) => React.ReactElement> = {
  classes: ClassesContent, courses: CoursesContent, messages: MessagesContent,
  exams: ExamsContent, grades: GradesContent, ai: AIContent,
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: student } = useGetStudent();
  const firstName = (student as any)?.firstName ?? (student as any)?.name?.split(' ')[0] ?? 'Student';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [activeId, setActiveId] = useState<WidgetId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLayout({ ...DEFAULT_LAYOUT, ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout, mounted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setLayout(prev => {
        const oi = prev.order.indexOf(active.id as WidgetId);
        const ni = prev.order.indexOf(over.id as WidgetId);
        return { ...prev, order: arrayMove(prev.order, oi, ni) };
      });
    }
  }, []);

  const setSpan = useCallback((id: WidgetId, s: ColSpan) =>
    setLayout(prev => ({ ...prev, spans: { ...prev.spans, [id]: s } })), []);
  const hideWidget = useCallback((id: WidgetId) =>
    setLayout(prev => ({ ...prev, hidden: [...prev.hidden, id] })), []);
  const restoreWidget = useCallback((id: WidgetId) =>
    setLayout(prev => ({ ...prev, hidden: prev.hidden.filter(h => h !== id) })), []);

  const visible = layout.order.filter(id => !layout.hidden.includes(id));

  return (
    <div className="space-y-4 w-full">
      {/* gradient mesh */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[100px]" style={{ background: '#424AFB' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.07] blur-[80px]"  style={{ background: '#FF6B8B' }} />
        <div className="absolute top-[40%] left-[35%] w-[300px] h-[300px] rounded-full opacity-[0.05] blur-[80px]" style={{ background: '#9D72FF' }} />
      </div>

      {/* greeting */}
      <div className="glass rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-[0.18] blur-3xl pointer-events-none" style={{ background: '#424AFB' }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-[0.14] blur-3xl pointer-events-none" style={{ background: '#FF6B8B' }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{today}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Here's your academic snapshot for today.</p>
          </div>
          <button
            onClick={() => setIsEditing(e => !e)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all shrink-0 border',
              isEditing
                ? 'bg-foreground text-background border-transparent'
                : 'glass-ctrl text-foreground hover:opacity-80',
            )}
          >
            {isEditing ? <><Check className="w-4 h-4" /> Done</> : <><LayoutGrid className="w-4 h-4" /> Customise</>}
          </button>
        </div>
      </div>

      {/* widget grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={e => setActiveId(e.active.id as WidgetId)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ gridAutoFlow: 'dense' }}>
            {visible.map(id => {
              const Content = WIDGET_CONTENT[id];
              const span = Math.min(layout.spans[id] ?? 1, 3) as ColSpan;
              return (
                <SortableWidget key={id} id={id} span={span} isEditing={isEditing}
                  onSpanChange={s => setSpan(id, s)} onHide={() => hideWidget(id)}>
                  <Content isEditing={isEditing} />
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="rotate-1 scale-[1.03] shadow-glass-lg opacity-90">
              {(() => { const C = WIDGET_CONTENT[activeId]; return <C />; })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* hidden widgets restore */}
      {isEditing && layout.hidden.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Hidden widgets</p>
          <div className="flex flex-wrap gap-2">
            {layout.hidden.map(id => (
              <button key={id} onClick={() => restoreWidget(id)}
                className="glass-inner flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:opacity-80 transition-opacity border border-[var(--glass-ctrl-border)]">
                <Eye className="w-3.5 h-3.5" />
                <span className="w-2 h-2 rounded-full" style={{ background: WIDGET_META[id].accent }} />
                {WIDGET_META[id].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex justify-end">
          <button onClick={() => setLayout(DEFAULT_LAYOUT)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
            Reset to default layout
          </button>
        </div>
      )}
    </div>
  );
}
