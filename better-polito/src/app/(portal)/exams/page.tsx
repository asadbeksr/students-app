'use client';
import { useGetExams } from '@/lib/queries/examHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function ExamsPage() {
  const { data: exams = [], isLoading } = useGetExams();

  const available = (exams as any[]).filter((e: any) => e.status === 'available');
  const booked = (exams as any[]).filter((e: any) => e.status === 'booked');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-light text-black">Exams</h1>
        <p className="text-sm text-[#777169] mt-1">Available and booked exam sessions.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          {booked.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#4e4e4e] uppercase tracking-wider mb-3">Booked</h2>
              <div className="space-y-3">
                {booked.map((exam: any) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </div>
          )}

          {available.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#4e4e4e] uppercase tracking-wider mb-3">Available</h2>
              <div className="space-y-3">
                {available.map((exam: any) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </div>
          )}

          {exams.length === 0 && (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
              <p className="text-[#777169]">No exams available at this time.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: any }) {
  const statusVariant = exam.status === 'booked' ? 'success' : 'secondary';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-black truncate">{exam.courseName}</p>
              <Badge variant={statusVariant} className="shrink-0">{exam.status}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#777169]">
              {exam.examStartsAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(exam.examStartsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {exam.examStartsAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(exam.examStartsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          {exam.status === 'available' && (
            <Button
              size="sm"
              onClick={() => toast.info('Exam booking coming soon')}
            >
              Book
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
