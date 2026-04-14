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
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-light text-foreground">Transcript</h1>
        <p className="text-sm text-muted-foreground mt-1">Your academic record.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill label="Average" value={avgGrade ? `${avgGrade}/30` : '—'} loading={gradesLoading} />
        <StatPill label="Credits" value={totalCredits ? String(totalCredits) : '—'} loading={gradesLoading} />
        <StatPill label="Exams" value={String(passedGrades.length)} loading={gradesLoading} />
      </div>

      {/* Provisional grades */}
      {(provLoading || (provisionalGrades as any[]).length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="w-4 h-4" />
              Pending Grades
              {(provisionalGrades as any[]).length > 0 && (
                <Badge className="bg-amber-500 text-white">{(provisionalGrades as any[]).length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {provLoading ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <div className="space-y-2">
                {(provisionalGrades as any[]).map((g: any, i: number) => (
                  <ProvisionalGradeCard key={g.id ?? i} grade={g} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grades by year */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gradesLoading ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : (grades as any[]).length === 0 ? (
            <div className="py-10 text-center">
              <GraduationCap className="w-8 h-8 text-border mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No grades yet.</p>
            </div>
          ) : sortedYears.length > 0 ? (
            <div className="space-y-6">
              {sortedYears.map(year => (
                <div key={year}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {year !== 'Unknown' ? `Academic Year ${year}` : 'Other'}
                  </p>
                  <div className="space-y-1">
                    {byYear[year].map((grade: any, i: number) => (
                      <GradeRow key={grade.id ?? i} grade={grade} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(grades as any[]).map((grade: any, i: number) => (
                <GradeRow key={grade.id ?? i} grade={grade} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GradeRow({ grade }: { grade: any }) {
  const gradeNum = parseFloat(grade.grade);
  const isLode = grade.honors === true || grade.cum_laude === true || grade.grade === '30L' || grade.lode === true;
  const variant = isNaN(gradeNum) ? 'secondary' : gradeNum >= 27 ? 'success' : gradeNum >= 18 ? 'secondary' : 'destructive';

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-background transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{grade.courseName ?? grade.name ?? grade.course}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {grade.date && (
            <span className="text-xs text-muted-foreground">
              {new Date(grade.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {grade.credits && <span className="text-xs text-muted-foreground">{grade.credits} cr</span>}
          {(grade.courseShortcode ?? grade.shortcode) && (
            <span className="text-xs text-muted-foreground font-mono">{grade.courseShortcode ?? grade.shortcode}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-3 shrink-0">
        {isLode && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] px-1.5">Lode</Badge>
        )}
        <Badge variant={variant} className="text-sm font-semibold px-2.5 min-w-[2.5rem] justify-center">
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
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{grade.courseName ?? grade.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {deadline && (
            <span className="text-xs text-amber-700">Accept by {new Date(deadline).toLocaleDateString('en-GB')}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {isLode && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] px-1.5">Lode</Badge>}
        <Badge className="bg-amber-100 text-amber-800 text-sm font-semibold px-2.5">{formatGrade(grade.grade)}/30</Badge>
        <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50 h-8 w-8 p-0" onClick={() => accept.mutate()} disabled={accept.isPending}>
          <CheckCircle2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 h-8 w-8 p-0" onClick={() => reject.mutate()} disabled={reject.isPending}>
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function StatPill({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="h-7 w-16 mx-auto mt-1" /> : (
          <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
