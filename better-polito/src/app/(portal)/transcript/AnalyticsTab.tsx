'use client';
import { useGetGrades } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

export function AnalyticsTab() {
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

  // Shared tooltip style for Recharts to support dark mode gracefully
  const tooltipContentStyle = {
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(20px)',
    fontSize: '12px',
    boxShadow: 'var(--glass-shadow)',
    color: 'hsl(var(--foreground))'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)
        ) : (
          <>
            <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col justify-center items-start">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Average</p>
              <p className="text-2xl sm:text-3xl font-light text-foreground">{avg ?? '—'}</p>
            </div>
            <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col justify-center items-start">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Passed</p>
              <p className="text-2xl sm:text-3xl font-light text-foreground">{numericGrades.length}</p>
            </div>
            <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col justify-center items-start">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Best Grade</p>
              <p className="text-2xl sm:text-3xl font-light text-foreground">
                {numericGrades.length ? Math.max(...numericGrades.map((g: any) => parseFloat(g.grade))) : '—'}
              </p>
            </div>
            <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col justify-center items-start">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Credits</p>
              <p className="text-2xl sm:text-3xl font-light text-foreground">
                {numericGrades.reduce((a: number, g: any) => a + (g.credits ?? 0), 0)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      {!isLoading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-medium mb-6">
              <BarChart3 className="w-5 h-5 text-primary" /> Grade History
            </div>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={20}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 30]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipContentStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="grade" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.grade >= 27 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-medium mb-6">
              <TrendingUp className="w-5 h-5 text-primary" /> Distribution
            </div>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData} barSize={32}>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipContentStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!isLoading && numericGrades.length === 0 && (
        <div className="glass rounded-3xl p-6 py-16 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No grade data available for analytics.</p>
        </div>
      )}
    </div>
  );
}
