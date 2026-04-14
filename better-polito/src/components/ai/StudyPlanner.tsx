'use client';
import { useState } from 'react';
import { useGetExams } from '@/lib/queries/examHooks';
import { useGetGrades } from '@/lib/queries/studentHooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Calendar, ChevronRight, Sparkles } from 'lucide-react';

export function StudyPlanner() {
  const { data: exams = [] } = useGetExams();
  const { data: grades = [] } = useGetGrades();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams, grades }),
      });
      if (!res.ok) throw new Error('Failed to generate plan');
      const data = await res.json();
      setPlan(data);
    } catch (e: any) {
      setError(e.message || 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-foreground">AI Study Planner</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate a personalized week-by-week study schedule based on your exams and grades.
          </p>
        </div>
        <Button onClick={generatePlan} disabled={loading}>
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? 'Generating…' : 'Generate Plan'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          {plan.weeks?.map((week: any, i: number) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Week {i + 1}: {week.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {week.tasks?.map((task: any, j: number) => (
                  <div key={j} className="flex items-start gap-3 p-3 rounded-xl bg-background">
                    <ChevronRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {plan.summary && (
            <Card className="bg-foreground text-surface border-0">
              <CardContent className="p-5">
                <p className="text-sm text-white/80">{plan.summary}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!plan && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="w-10 h-10 text-border mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Click &ldquo;Generate Plan&rdquo; to create your personalized study schedule.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
