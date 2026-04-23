'use client';
import { useGetGrades, useGetProvisionalGrades } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';
import { PROVISIONAL_GRADES_QUERY_KEY, GRADES_QUERY_KEY } from '@/lib/queries/studentHooks';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsTab } from './AnalyticsTab';

function formatGrade(grade: any): string {
  const n = parseFloat(grade);
  if (isNaN(n)) return String(grade ?? '—');
  if (n === 30) return '30';
  return String(Math.round(n));
}

export default function TranscriptPage() {
  const { data: grades = [], isLoading: gradesLoading } = useGetGrades();
  const { data: provisionalGrades = [], isLoading: provLoading } = useGetProvisionalGrades();

  const passedGrades = (grades as any[]).filter(g => g.passed !== false && !isNaN(parseFloat(g.grade)));
  const totalCredits = passedGrades.reduce((acc: number, g: any) => acc + (g.credits ?? 0), 0);
  const avgGrade = passedGrades.length > 0
    ? (passedGrades.reduce((acc: number, g: any) => acc + parseFloat(g.grade), 0) / passedGrades.length).toFixed(2)
    : null;

  // Group by academic year
  const byYear: Record<string, any[]> = {};
  (grades as any[]).forEach(g => {
    const year = g.academicYear ?? g.year ?? (g.date ? new Date(g.date).getFullYear() : 'Unknown');
    const key = String(year);
    if (!byYear[key]) byYear[key] = [];
    byYear[key].push(g);
  });
  const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  return (
    <div className="w-full">
      <Tabs defaultValue="overview" className="w-full space-y-6">
        
        {/* Header and Tabs on same row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-foreground">Transcript</h1>
            <p className="text-sm text-muted-foreground mt-1">Your academic record.</p>
          </div>
          <TabsList className="glass-ctrl rounded-xl p-1 shrink-0">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatPill label="Average" value={avgGrade ? `${avgGrade}/30` : '—'} loading={gradesLoading} />
            <StatPill label="Credits" value={totalCredits ? String(totalCredits) : '—'} loading={gradesLoading} />
            <StatPill label="Exams" value={String(passedGrades.length)} loading={gradesLoading} />
          </div>

          {/* Provisional grades */}
          {(provLoading || (provisionalGrades as any[]).length > 0) && (
            <div className="glass rounded-3xl p-6 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-4 font-medium">
                <Clock className="w-5 h-5" />
                Pending Grades
                {(provisionalGrades as any[]).length > 0 && (
                  <Badge className="bg-amber-500 text-white ml-2">{(provisionalGrades as any[]).length}</Badge>
                )}
              </div>
              <div>
                {provLoading ? (
                  <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {(provisionalGrades as any[]).map((g: any, i: number) => (
                      <ProvisionalGradeCard key={g.id ?? i} grade={g} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grades by year */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-medium mb-6">
              <GraduationCap className="w-5 h-5 text-primary" /> Grades
            </div>
            <div>
              {gradesLoading ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
              ) : (grades as any[]).length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No grades yet.</p>
                </div>
              ) : sortedYears.length > 0 ? (
                <div className="space-y-8">
                  {sortedYears.map(year => (
                    <div key={year}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                        {year !== 'Unknown' ? `Academic Year ${year}` : 'Other'}
                      </p>
                      <div className="space-y-2">
                        {byYear[year].map((grade: any, i: number) => (
                          <GradeRow key={grade.id ?? i} grade={grade} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(grades as any[]).map((grade: any, i: number) => (
                    <GradeRow key={grade.id ?? i} grade={grade} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GradeRow({ grade }: { grade: any }) {
  const gradeNum = parseFloat(grade.grade);
  const isLode = grade.honors === true || grade.cum_laude === true || grade.grade === '30L' || grade.lode === true;
  const variant = isNaN(gradeNum) ? 'secondary' : gradeNum >= 27 ? 'success' : gradeNum >= 18 ? 'secondary' : 'destructive';

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-2xl glass-inner hover:opacity-80 transition-opacity">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{grade.courseName ?? grade.name ?? grade.course}</p>
        <div className="flex items-center gap-3 mt-1">
          {grade.date && (
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(grade.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {grade.credits && <span className="text-xs text-muted-foreground">{grade.credits} cr</span>}
          {(grade.courseShortcode ?? grade.shortcode) && (
            <span className="text-xs text-muted-foreground font-mono">{grade.courseShortcode ?? grade.shortcode}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {isLode && (
          <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 text-[10px] px-1.5 font-bold uppercase">Lode</Badge>
        )}
        <Badge variant={variant} className="text-sm font-bold px-3 py-0.5 min-w-[2.5rem] justify-center">
          {formatGrade(grade.grade)}
        </Badge>
      </div>
    </div>
  );
}

function ProvisionalGradeCard({ grade }: { grade: any }) {
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: () => getApiClient().request<any>(`/provisional-grades/${grade.id}/accept`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Grade accepted');
      qc.invalidateQueries({ queryKey: PROVISIONAL_GRADES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: GRADES_QUERY_KEY });
    },
    onError: () => toast.error('Could not accept grade'),
  });
  const reject = useMutation({
    mutationFn: () => getApiClient().request<any>(`/provisional-grades/${grade.id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Grade rejected');
      qc.invalidateQueries({ queryKey: PROVISIONAL_GRADES_QUERY_KEY });
    },
    onError: () => toast.error('Could not reject grade'),
  });
  const deadline = grade.acceptDeadline ?? grade.deadline;
  const isLode = grade.honors === true || grade.lode === true;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl glass-inner border border-amber-500/20 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{grade.courseName ?? grade.name}</p>
        <div className="flex items-center gap-2 mt-1">
          {deadline && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-500">Accept by {new Date(deadline).toLocaleDateString('en-GB')}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLode && <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 text-[10px] px-1.5 font-bold uppercase">Lode</Badge>}
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/20 text-sm font-bold px-3 py-0.5">{formatGrade(grade.grade)}/30</Badge>
        <div className="flex items-center gap-1 ml-1">
          <Button size="icon" variant="ghost" className="text-green-600 dark:text-green-500 hover:bg-green-500/10 h-8 w-8" onClick={() => accept.mutate()} disabled={accept.isPending}>
            <CheckCircle2 className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost" className="text-red-500 dark:text-red-400 hover:bg-red-500/10 h-8 w-8" onClick={() => reject.mutate()} disabled={reject.isPending}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col justify-center items-start">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{label}</p>
      {loading ? <Skeleton className="h-8 w-16" /> : (
        <p className="text-2xl sm:text-3xl font-light text-foreground">{value}</p>
      )}
    </div>
  );
}
