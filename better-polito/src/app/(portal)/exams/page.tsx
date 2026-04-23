'use client';
import { useState, useMemo } from 'react';
import { useGetExams } from '@/lib/queries/examHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ClipboardList, Calendar, Clock, MapPin, Users,
  Search, ChevronDown, ChevronUp, CalendarPlus, Info,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS = {
  BOOKED: 'booked',
  REQUEST_ACCEPTED: 'requestAccepted',
  REQUESTED: 'requested',
  REQUEST_REJECTED: 'requestRejected',
  AVAILABLE: 'available',
  REQUESTABLE: 'requestable',
  UNAVAILABLE: 'unavailable',
} as const;

const ACTIVE_STATUSES = [STATUS.BOOKED, STATUS.REQUEST_ACCEPTED, STATUS.REQUESTED];
const OPEN_STATUSES = [STATUS.AVAILABLE, STATUS.REQUESTABLE];
const CLOSED_STATUSES = [STATUS.REQUEST_REJECTED, STATUS.UNAVAILABLE];

type FilterTab = 'all' | 'booked' | 'available' | 'unavailable';

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  if ([STATUS.BOOKED, STATUS.REQUEST_ACCEPTED].includes(status as any)) return 'success';
  if (status === STATUS.REQUESTED) return 'secondary';
  if (status === STATUS.REQUEST_REJECTED) return 'destructive';
  if ([STATUS.AVAILABLE, STATUS.REQUESTABLE].includes(status as any)) return 'outline';
  return 'secondary';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    booked: 'Booked',
    requestAccepted: 'Accepted',
    requested: 'Pending',
    requestRejected: 'Rejected',
    available: 'Available',
    requestable: 'Requestable',
    unavailable: 'Unavailable',
  };
  return map[status] ?? status;
}

const EXAM_TYPE_SHORT: Record<string, string> = {
  'Esami scritti a risposta aperta o chiusa tramite PC': 'PC Written',
  'Esami scritti a risposta aperta': 'Written',
  'Esami orali': 'Oral',
  'Esami scritti e orali': 'Written + Oral',
  'Elaborati progettuali': 'Project',
  'Laboratorio': 'Lab',
};

function shortType(type: string): string {
  return EXAM_TYPE_SHORT[type] ?? type;
}

function bookingWindowLabel(exam: any): { label: string; color: string } | null {
  const now = Date.now();
  const opensAt = exam.bookingStartsAt ? new Date(exam.bookingStartsAt).getTime() : null;
  const closesAt = exam.bookingEndsAt ? new Date(exam.bookingEndsAt).getTime() : null;

  // 1970 sentinel = "not set"
  if (opensAt && new Date(exam.bookingStartsAt).getFullYear() < 2000) return null;

  if (opensAt && opensAt > now) {
    const days = Math.ceil((opensAt - now) / 86400000);
    return { label: `Booking opens in ${days}d`, color: 'text-blue-500' };
  }
  if (closesAt && closesAt > now) {
    const days = Math.ceil((closesAt - now) / 86400000);
    return { label: `Book by ${new Date(exam.bookingEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${days}d left)`, color: 'text-amber-600' };
  }
  return null;
}

function addToCalendar(exam: any) {
  const start = new Date(exam.examStartsAt);
  const end = exam.examEndsAt ? new Date(exam.examEndsAt) : new Date(start.getTime() + 2 * 3600000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const location = exam.places?.map((p: any) => p.name).join(', ') ?? exam.classrooms ?? '';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${exam.courseName} — Exam`,
    `LOCATION:${location}`,
    `DESCRIPTION:${exam.type ?? ''}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exam.courseName}-exam.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExamsPage() {
  const { data: exams = [], isLoading } = useGetExams();
  const all = exams as any[];

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(e => {
      const matchesSearch = !q || (e.courseName ?? '').toLowerCase().includes(q);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'booked' && ACTIVE_STATUSES.includes(e.status)) ||
        (filter === 'available' && OPEN_STATUSES.includes(e.status)) ||
        (filter === 'unavailable' && CLOSED_STATUSES.includes(e.status));
      return matchesSearch && matchesFilter;
    });
  }, [all, search, filter]);

  const booked = filtered.filter(e => ACTIVE_STATUSES.includes(e.status));
  const available = filtered.filter(e => OPEN_STATUSES.includes(e.status));
  const unavailable = filtered.filter(e => CLOSED_STATUSES.includes(e.status));

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: all.length },
    { key: 'booked', label: 'Booked', count: all.filter(e => ACTIVE_STATUSES.includes(e.status)).length },
    { key: 'available', label: 'Available', count: all.filter(e => OPEN_STATUSES.includes(e.status)).length },
    { key: 'unavailable', label: 'Unavailable', count: all.filter(e => CLOSED_STATUSES.includes(e.status)).length },
  ];

  return (
    <div className="space-y-5 w-full">
      <div>
        <h1 className="text-3xl font-light text-foreground">Exams</h1>
        <p className="text-sm text-muted-foreground mt-1">Available and booked exam sessions.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === t.key
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs ${filter === t.key ? 'opacity-70' : 'opacity-60'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : all.length === 0 ? (
        <div className="py-16 flex flex-col items-center">
          <ClipboardList className="w-10 h-10 text-border mb-3" />
          <p className="text-muted-foreground">No exams at this time.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center">
          <Search className="w-10 h-10 text-border mb-3" />
          <p className="text-muted-foreground">No exams match your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Booked / Pending */}
          {booked.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Booked / Pending
              </h2>
              <div className="space-y-3">
                {booked.map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            </section>
          )}

          {/* Available */}
          {available.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Available
              </h2>
              <div className="space-y-3">
                {available.map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            </section>
          )}

          {/* Unavailable — collapsed by default */}
          {unavailable.length > 0 && (
            <section>
              <Collapsible open={unavailableOpen} onOpenChange={setUnavailableOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors">
                    {unavailableOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Unavailable · {unavailable.length}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3">
                    {unavailable.map(exam => <ExamCard key={exam.id} exam={exam} />)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: any }) {
  const [showFeedback, setShowFeedback] = useState(true);

  const canBook = [STATUS.AVAILABLE, STATUS.REQUESTABLE].includes(exam.status);
  const canCancel = [STATUS.BOOKED, STATUS.REQUESTED, STATUS.REQUEST_ACCEPTED].includes(exam.status);
  const hasCalendar = !!exam.examStartsAt;

  const startsAt = exam.examStartsAt;
  const location = exam.places?.map((p: any) => p.name).join(', ') ?? exam.classrooms;
  const examType = exam.type;
  const bookingWindow = bookingWindowLabel(exam);
  const feedback = exam.feedback?.trim();

  const bookedCount: number = exam.bookedCount ?? 0;
  const availableCount: number = exam.availableCount ?? 999;
  const hasSeats = availableCount !== 999;
  const totalSeats = hasSeats ? bookedCount + availableCount : null;
  const fillPct = totalSeats ? Math.round((bookedCount / totalSeats) * 100) : 0;

  return (
    <Card className={exam.status === STATUS.UNAVAILABLE || exam.status === STATUS.REQUEST_REJECTED ? 'opacity-70' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium text-foreground">{exam.courseName}</p>
              <Badge variant={statusVariant(exam.status)} className="text-xs shrink-0">
                {statusLabel(exam.status)}
              </Badge>
              {examType && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {shortType(examType)}
                </Badge>
              )}
            </div>

            {/* Date + location */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {startsAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {new Date(startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {canBook && (
              <Button size="sm" onClick={() => toast.info('Exam booking coming soon')}>
                Book
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => toast.info('Cancellation coming soon')}>
                Cancel
              </Button>
            )}
            {hasCalendar && (
              <Button size="sm" variant="ghost" className="text-muted-foreground px-2"
                onClick={() => addToCalendar(exam)}
                title="Add to calendar">
                <CalendarPlus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Seats bar */}
        {hasSeats && totalSeats !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Seats</span>
              <span>{bookedCount} / {totalSeats} booked</span>
            </div>
            <Progress value={fillPct} className="h-1.5" />
          </div>
        )}

        {/* Booking window */}
        {bookingWindow && (
          <p className={`text-xs flex items-center gap-1 ${bookingWindow.color}`}>
            <Clock className="w-3 h-3 shrink-0" />
            {bookingWindow.label}
          </p>
        )}

        {/* Feedback toggle */}
        {feedback && (
          <div>
            <button
              onClick={() => setShowFeedback(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3 h-3" />
              {showFeedback ? 'Hide note' : 'Show note'}
            </button>
            {showFeedback && (
              <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 leading-relaxed">
                {feedback}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
