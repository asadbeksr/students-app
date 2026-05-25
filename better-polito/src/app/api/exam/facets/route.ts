import { NextResponse } from 'next/server';
import { getSubject } from '@/config/subjects';
import { computeFacets, loadPool } from '@/lib/exam/questions';
import type { ExamMode } from '@/types/exam';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');
  const mode = url.searchParams.get('mode') as ExamMode | null;

  if (!subject || !mode) {
    return NextResponse.json({ error: 'Missing subject or mode' }, { status: 400 });
  }

  const cfg = getSubject(subject);
  if (!cfg) return NextResponse.json({ error: 'Unknown subject' }, { status: 404 });
  if (!cfg.modes[mode]) return NextResponse.json({ error: 'Mode not available' }, { status: 404 });

  const pool = await loadPool(cfg, mode);
  const facets = computeFacets(pool);
  const catalog = pool.map((q) => ({
    id: q.id,
    topics: q.topics ?? [],
    difficulty: q.difficulty,
    language: q.language,
  }));
  return NextResponse.json({ ...facets, catalog });
}
