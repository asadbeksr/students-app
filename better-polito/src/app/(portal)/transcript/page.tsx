'use client';
import { useGetGrades } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatThirtiethsGrade } from '@/lib/utils/grades';
import { GraduationCap, TrendingUp } from 'lucide-react';

export default function TranscriptPage() {
  const { data: grades = [], isLoading } = useGetGrades();

  const numericGrades = (grades as any[]).filter((g: any) => !isNaN(parseFloat(g.grade)));
  const avg = numericGrades.length
    ? (numericGrades.reduce((a: number, g: any) => a + parseFloat(g.grade), 0) / numericGrades.length).toFixed(2)
    : null;
  const totalCredits = (grades as any[]).reduce((a: number, g: any) => a + (g.credits ?? 0), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-light text-black">Transcript</h1>
        <p className="text-sm text-[#777169] mt-1">Your academic record and grades.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#777169]">Average Grade</p>
                <p className="text-3xl font-light mt-1">{avg ?? '—'}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-[#4e4e4e]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div>
              <p className="text-xs text-[#777169]">Exams Passed</p>
              <p className="text-3xl font-light mt-1">{numericGrades.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div>
              <p className="text-xs text-[#777169]">Total Credits</p>
              <p className="text-3xl font-light mt-1">{totalCredits}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades list */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Grades</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : (grades as any[]).length === 0 ? (
            <div className="py-12 text-center">
              <GraduationCap className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
              <p className="text-[#777169]">No grades recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(grades as any[]).map((grade: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#f5f5f5] hover:bg-[#f5f2ef] transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-black truncate">{grade.courseName || grade.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {grade.date && <span className="text-xs text-[#777169]">{new Date(grade.date).toLocaleDateString('en-GB')}</span>}
                      {grade.credits && <span className="text-xs text-[#777169]">{grade.credits} credits</span>}
                    </div>
                  </div>
                  <Badge variant={parseFloat(grade.grade) >= 27 ? 'success' : parseFloat(grade.grade) >= 18 ? 'secondary' : 'destructive'} className="ml-4 shrink-0 text-sm font-semibold px-3">
                    {formatThirtiethsGrade(parseFloat(grade.grade))}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
