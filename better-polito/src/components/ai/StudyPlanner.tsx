'use client';
import { useEffect, useState } from 'react';
import { useGetExams } from '@/lib/queries/examHooks';
import { useGetGrades, useGetStudent } from '@/lib/queries/studentHooks';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Calendar, CheckCircle2, Circle, RefreshCw, Clock } from 'lucide-react';

export function StudyPlanner() {
  const { data: exams = [] } = useGetExams();
  const { data: grades = [] } = useGetGrades();
  const { data: student } = useGetStudent();
  const { data: courses = [] } = useGetCourses();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem('ai_study_plan');
      if (savedPlan) setPlan(JSON.parse(savedPlan));
      const savedTasks = localStorage.getItem('ai_study_completed_tasks');
      if (savedTasks) setCompletedTasks(JSON.parse(savedTasks));
    } catch {}
    setIsLoaded(true);
  }, []);

  const toggleTask = (taskId: string) => {
    const next = { ...completedTasks, [taskId]: !completedTasks[taskId] };
    setCompletedTasks(next);
    localStorage.setItem('ai_study_completed_tasks', JSON.stringify(next));
  };

  const generatePlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams, grades, student, courses }),
      });
      if (!res.ok) throw new Error('Failed to generate plan');
      const data = await res.json();
      data.generatedAt = new Date().toISOString();
      setPlan(data);
      localStorage.setItem('ai_study_plan', JSON.stringify(data));
      setCompletedTasks({});
      localStorage.setItem('ai_study_completed_tasks', '{}');
    } catch (e: any) {
      setError(e.message || 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return null;

  const totalTasks = plan?.weeks?.reduce((acc: number, w: any) => acc + (w.tasks?.length ?? 0), 0) ?? 0;
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Sparkles className="w-4 h-4" />
          Generating your study plan…
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-36" />)}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!plan) {
    return (
      <div className="py-16 flex flex-col items-center text-center">
        <Sparkles className="w-10 h-10 text-border mb-3" />
        <p className="font-medium text-foreground mb-1">No study plan yet</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Generate a personalised week-by-week schedule based on your
          {(courses as any[]).length ? ` ${(courses as any[]).length} courses` : ' courses'},
          grades and upcoming exams.
        </p>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <Button onClick={generatePlan}>
          <Sparkles className="w-4 h-4 mr-2" />
          Generate plan
        </Button>
      </div>
    );
  }

  // ── Plan view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Progress bar header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completedCount} / {totalTasks} tasks · {progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {plan.generatedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(plan.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={generatePlan}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Week cards */}
      <div className="space-y-4">
        {plan.weeks?.map((week: any, i: number) => {
          const tasks = week.tasks ?? [];
          const doneInWeek = tasks.filter((_: any, j: number) => completedTasks[`w${i}-t${j}`]).length;
          const allDone = tasks.length > 0 && doneInWeek === tasks.length;

          return (
            <Card key={i} className={allDone ? 'opacity-60' : ''}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Week {i + 1}{week.label ? ` · ${week.label}` : ''}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {doneInWeek} / {tasks.length}
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((task: any, j: number) => {
                  const taskId = `w${i}-t${j}`;
                  const done = !!completedTasks[taskId];
                  return (
                    <div
                      key={taskId}
                      onClick={() => toggleTask(taskId)}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        done ? 'bg-muted/40' : 'bg-background border hover:bg-muted/30'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {done
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Circle className="w-4 h-4 text-muted-foreground" />
                        }
                      </span>
                      <div className={done ? 'opacity-50 line-through' : ''}>
                        <p className="text-sm font-medium leading-snug">{task.subject}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plan.summary && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{plan.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
