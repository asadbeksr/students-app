'use client';
import { useGetSurveys } from '@/lib/queries/surveysHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Clock, ExternalLink, BookOpen } from 'lucide-react';

export default function SurveysPage() {
  const { data: surveys = [], isLoading } = useGetSurveys();
  const pending = (surveys as any[]).filter(s => !s.isCompiled);
  const done = (surveys as any[]).filter(s => s.isCompiled);

  return (
    <div className="space-y-6 w-full">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-light text-foreground">Surveys</h1>
          {pending.length > 0 && <Badge className="bg-amber-500 text-white">{pending.length} pending</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Course evaluation surveys to complete.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (surveys as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <ClipboardCheck className="w-10 h-10 text-border mb-3" />
            <p className="text-muted-foreground">No surveys available.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending</h2>
              <div className="space-y-3">
                {pending.map((s: any, i: number) => <SurveyCard key={s.id ?? i} survey={s} />)}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completed</h2>
              <div className="space-y-3">
                {done.map((s: any, i: number) => <SurveyCard key={s.id ?? i} survey={s} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SurveyCard({ survey: s }: { survey: any }) {
  const deadline = s.deadline ?? s.expiresAt ?? s.dueDate;
  const isOverdue = deadline && new Date(deadline) < new Date();
  const surveyUrl = s.url ?? s.surveyLink ?? s.link;

  return (
    <Card className={s.isCompiled ? 'opacity-70' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium text-foreground">{s.courseName ?? s.name ?? s.title}</p>
              {s.isMandatory && <Badge variant="destructive" className="text-[10px] px-1.5">Mandatory</Badge>}
              {s.isCompiled && <Badge variant="success" className="text-[10px] px-1.5">Done</Badge>}
            </div>

            {(s.courseId ?? s.courseShortcode) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <BookOpen className="w-3 h-3" />
                {s.courseShortcode ?? s.courseId}
              </p>
            )}

            {deadline && (
              <p className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                <Clock className="w-3 h-3" />
                {isOverdue ? 'Expired ' : 'Due '}
                {new Date(deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          {!s.isCompiled && (
            <Button
              size="sm"
              onClick={() => surveyUrl ? window.open(surveyUrl, '_blank') : window.open('https://didattica.polito.it', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
