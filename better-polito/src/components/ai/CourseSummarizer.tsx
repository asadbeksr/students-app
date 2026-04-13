'use client';
import { useState } from 'react';
import { useGetCourses } from '@/lib/queries/courseHooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Sparkles } from 'lucide-react';

export function CourseSummarizer() {
  const { data: courses = [] } = useGetCourses();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const summarize = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    setSummary('');
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse, text: `Summarize course ${selectedCourse}` }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSummary(data.summary || data.content || JSON.stringify(data));
    } catch (e: any) {
      setSummary('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-light text-foreground">Course Summarizer</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Generate AI summaries with key concepts and exam questions.</p>
      </div>

      <div className="flex gap-3">
        <select
          className="flex h-10 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="">Select a course…</option>
          {(courses as any[]).map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button onClick={summarize} disabled={loading || !selectedCourse}>
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? 'Summarizing…' : 'Summarize'}
        </Button>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>}

      {summary && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-text-muted whitespace-pre-wrap text-sm leading-relaxed">
              {summary}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
