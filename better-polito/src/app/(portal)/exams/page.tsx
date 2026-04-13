'use client';
import { useGetExams } from '@/lib/queries/examHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

// Real ExamStatusEnum values from @polito/student-api-client
const STATUS = {
  BOOKED: 'Booked',
  REQUEST_ACCEPTED: 'RequestAccepted',
  REQUESTED: 'Requested',
  REQUEST_REJECTED: 'RequestRejected',
  AVAILABLE: 'Available',
  REQUESTABLE: 'Requestable',
  UNAVAILABLE: 'Unavailable',
} as const;

// Which statuses count as "user has action / relevant"
const ACTIVE_STATUSES = [STATUS.BOOKED, STATUS.REQUEST_ACCEPTED, STATUS.REQUESTED];
const OPEN_STATUSES = [STATUS.AVAILABLE, STATUS.REQUESTABLE];
const CLOSED_STATUSES = [STATUS.REQUEST_REJECTED, STATUS.UNAVAILABLE];

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  if ([STATUS.BOOKED, STATUS.REQUEST_ACCEPTED].includes(status as any)) return 'success';
  if (status === STATUS.REQUESTED) return 'secondary';
  if ([STATUS.REQUEST_REJECTED].includes(status as any)) return 'destructive';
  if ([STATUS.AVAILABLE, STATUS.REQUESTABLE].includes(status as any)) return 'outline';
  return 'secondary';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    Booked: 'Booked',
    RequestAccepted: 'Accepted',
    Requested: 'Pending',
    RequestRejected: 'Rejected',
    Available: 'Available',
    Requestable: 'Requestable',
    Unavailable: 'Unavailable',
  };
  return map[status] ?? status;
}

export default function ExamsPage() {
  const { data: exams = [], isLoading } = useGetExams();
  const all = exams as any[];

  const booked = all.filter(e => ACTIVE_STATUSES.includes(e.status));
  const available = all.filter(e => OPEN_STATUSES.includes(e.status));
  const unavailable = all.filter(e => CLOSED_STATUSES.includes(e.status));

  const sections = [
    { title: 'Booked / Pending', items: booked, show: booked.length > 0 },
    { title: 'Available', items: available, show: available.length > 0 },
    { title: 'Unavailable', items: unavailable, show: unavailable.length > 0 },
  ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-light text-foreground">Exams</h1>
        <p className="text-sm text-muted-foreground mt-1">Available and booked exam sessions.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : all.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardList className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-muted-foreground">No exams at this time.</p>
        </div>
      ) : (
        <>
          {sections.map(({ title, items, show }) =>
            show ? (
              <div key={title}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
                <div className="space-y-3">
                  {items.map((exam: any) => <ExamCard key={exam.id} exam={exam} />)}
                </div>
              </div>
            ) : null
          )}
        </>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: any }) {
  const canBook = [STATUS.AVAILABLE, STATUS.REQUESTABLE].includes(exam.status);
  const canCancel = [STATUS.BOOKED, STATUS.REQUESTED, STATUS.REQUEST_ACCEPTED].includes(exam.status);

  // Date fields — try multiple field names
  const startsAt = exam.examStartsAt ?? exam.startsAt ?? exam.date;
  const bookingDeadline = exam.bookingDeadline ?? exam.subscriptionDeadline ?? exam.registrationDeadline;
  const location = exam.location ?? exam.classroom ?? exam.room;
  const examType = exam.type ?? exam.examType ?? exam.modality;
  const seats = exam.seatsAvailable ?? exam.availableSeats;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <p className="font-medium text-foreground truncate">
                {exam.courseName ?? exam.course ?? exam.name}
              </p>
              <Badge variant={statusVariant(exam.status)} className="shrink-0 text-xs">
                {statusLabel(exam.status)}
              </Badge>
              {examType && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">{examType}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {startsAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </span>
              )}
              {seats != null && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {seats} seats
                </span>
              )}
            </div>

            {bookingDeadline && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Book by {new Date(bookingDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>

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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
