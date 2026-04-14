'use client';
import { useGetGrades } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: grades = [], isLoading } = useGetGrades();

  const numericGrades = (grades as any[]).filter((g: any) => !isNaN(parseFloat(g.grade)));
  const chartData = numericGrades.slice(0, 10).map((g: any) => ({
    name: (g.courseName || g.name || '').slice(0, 12),
    grade: parseFloat(g.grade),
  }));

  const avg = numericGrades.length
    ? (numericGrades.reduce((a: number, g: any) => a + parseFloat(g.grade), 0) / numericGrades.length).toFixed(2)
    : null;

  const distribution: Record<string, number> = { '18-21': 0, '22-24': 0, '25-27': 0, '28-30': 0, '30L': 0 };
  numericGrades.forEach((g: any) => {
    const v = parseFloat(g.grade);
    if (v >= 30) distribution['30L']++;
    else if (v >= 28) distribution['28-30']++;
    else if (v >= 25) distribution['25-27']++;
    else if (v >= 22) distribution['22-24']++;
    else distribution['18-21']++;
  });

  const distData = Object.entries(distribution).map(([range, count]) => ({ range, count }));

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-light text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Grade analytics and academic performance insights.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Average Grade</p>
                <p className="text-3xl font-light mt-1">{avg ?? '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Exams Passed</p>
                <p className="text-3xl font-light mt-1">{numericGrades.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Best Grade</p>
                <p className="text-3xl font-light mt-1">
                  {numericGrades.length ? Math.max(...numericGrades.map((g: any) => parseFloat(g.grade))) : '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Credits Earned</p>
                <p className="text-3xl font-light mt-1">
                  {numericGrades.reduce((a: number, g: any) => a + (g.credits ?? 0), 0)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      {!isLoading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Grade History</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={20}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#777169' }} />
                  <YAxis domain={[0, 30]} tick={{ fontSize: 10, fill: '#777169' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e5e5', fontSize: 12 }}
                  />
                  <Bar dataKey="grade" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.grade >= 27 ? '#000000' : entry.grade >= 24 ? '#4e4e4e' : '#777169'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distData} barSize={32}>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#777169' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#777169' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e5e5', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#000000" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && numericGrades.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-10 h-10 text-border mx-auto mb-3" />
            <p className="text-muted-foreground">No grade data available for analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
