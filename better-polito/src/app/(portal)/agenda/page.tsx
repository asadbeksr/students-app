'use client';
import { useState, useMemo } from 'react';
import { useGetDeadlines, useGetLectures } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BookOpen, Clock, MapPin, Monitor, Calendar } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekDates(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

function toISO(d: Date) { return d.toISOString().split('T')[0]; }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateRange(start: Date, end: Date) {
  const same = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (same) return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]}`;
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

export default function AgendaPage() {
  const today = new Date();
  const [currentWeek, setCurrentWeek] = useState(today);
  const weekDates = getWeekDates(currentWeek);
  const [selectedDay, setSelectedDay] = useState(today.toDateString());

  const fromDate = toISO(weekDates[0]);
  const toDate = toISO(weekDates[6]);

  const { data: deadlines = [], isLoading: deadlinesLoading } = useGetDeadlines({ fromDate, toDate });
  const { data: lectures = [], isLoading: lecturesLoading } = useGetLectures({ fromDate, toDate });

  const isLoading = deadlinesLoading || lecturesLoading;

  // Map events to days
  const eventsByDay = useMemo(() => {
    const map: Record<string, { type: string; item: any }[]> = {};
    weekDates.forEach(d => { map[toISO(d)] = []; });

    (lectures as any[]).forEach(l => {
      const day = (l.startsAt ?? l.date ?? '').split('T')[0];
      if (map[day]) map[day].push({ type: 'lecture', item: l });
    });
    (deadlines as any[]).forEach(d => {
      const day = (d.startsAt ?? d.date ?? d.dueDate ?? '').split('T')[0];
      if (map[day]) map[day].push({ type: 'deadline', item: d });
    });

    return map;
  }, [lectures, deadlines, weekDates]);

  const selectedISO = toISO(new Date(selectedDay));
  const selectedEvents = eventsByDay[selectedISO] ?? [];

  // Upcoming deadlines (next 2 weeks)
  const upcoming = (deadlines as any[])
    .filter(d => {
      const t = new Date(d.startsAt ?? d.date ?? d.dueDate ?? '').getTime();
      return t >= today.getTime();
    })
    .sort((a, b) => new Date(a.startsAt ?? a.date ?? a.dueDate).getTime() - new Date(b.startsAt ?? b.date ?? b.dueDate).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-light text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground mt-1">Your weekly schedule and deadlines.</p>
      </div>

      {/* Week navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {formatDateRange(weekDates[0], weekDates[6])} {weekDates[0].getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentWeek(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; })}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => { setCurrentWeek(today); setSelectedDay(today.toDateString()); }}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentWeek(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day selector */}
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((d, i) => {
              const iso = toISO(d);
              const isToday = toISO(today) === iso;
              const isSelected = selectedDay === d.toDateString();
              const hasEvents = (eventsByDay[iso] ?? []).length > 0;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(d.toDateString())}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                    isSelected ? 'bg-foreground text-surface' :
                    isToday ? 'bg-background text-foreground font-semibold' :
                    'hover:bg-background text-muted-foreground'
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">{DAYS[i]}</span>
                  <span className="text-base">{d.getDate()}</span>
                  {hasEvents && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-black'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Events for selected day */}
          <div className="mt-4 space-y-2 min-h-[80px]">
            {isLoading ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : selectedEvents.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar className="w-6 h-6 text-border mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No events this day</p>
              </div>
            ) : (
              selectedEvents.sort((a, b) => {
                const ta = new Date(a.item.startsAt ?? a.item.date ?? 0).getTime();
                const tb = new Date(b.item.startsAt ?? b.item.date ?? 0).getTime();
                return ta - tb;
              }).map((e, i) => (
                e.type === 'lecture'
                  ? <LectureCard key={i} lecture={e.item} />
                  : <DeadlineCard key={i} deadline={e.item} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming deadlines list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlinesLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : upcoming.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-7 h-7 text-border mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.map((d: any, i: number) => <DeadlineCard key={i} deadline={d} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LectureCard({ lecture }: { lecture: any }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
        <BookOpen className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{lecture.courseName ?? lecture.course ?? lecture.title}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {lecture.startsAt && (
            <span className="text-xs text-blue-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(lecture.startsAt)}{lecture.endsAt ? `–${formatTime(lecture.endsAt)}` : ''}
            </span>
          )}
          {(lecture.room ?? lecture.building) && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[lecture.room, lecture.building].filter(Boolean).join(', ')}
            </span>
          )}
          {lecture.isOnline && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Online
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineCard({ deadline }: { deadline: any }) {
  const dateStr = deadline.startsAt ?? deadline.date ?? deadline.dueDate;
  const type = deadline.type ?? deadline.category;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-background hover:bg-surface-warm transition-colors">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        <Clock className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{deadline.title ?? deadline.name ?? deadline.courseName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {dateStr && (
            <span className="text-xs text-muted-foreground">
              {new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {deadline.endsAt && deadline.endsAt !== dateStr && ` – ${new Date(deadline.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            </span>
          )}
          {type && <Badge variant="secondary" className="text-[10px] px-1.5">{type}</Badge>}
        </div>
      </div>
    </div>
  );
}
