import { NextResponse } from 'next/server';
import { verifyAttempt } from '@/lib/exam/token';
import type { GradedResult } from '@/types/exam';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    attemptToken?: string;
    answers?: Record<string, string>;
  };
  if (!body.attemptToken) {
    return NextResponse.json({ error: 'Missing attemptToken' }, { status: 400 });
  }
  let payload;
  try {
    payload = verifyAttempt(body.attemptToken);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid token' },
      { status: 401 },
    );
  }

  const answers = body.answers ?? {};
  const { scoring, passScore } = payload;
  const results: GradedResult[] = [];
  let correct = 0, wrong = 0, blank = 0, scoreable = 0, marks = 0;

  for (const q of payload.questions) {
    const given = answers[q.id] ?? null;
    if (!q.correct_answer) {
      results.push({
        id: q.id,
        given,
        correct_answer: null,
        solution: q.solution ?? null,
        status: 'unscored',
        marks: 0,
      });
      continue;
    }
    scoreable++;
    let status: GradedResult['status'];
    let m: number;
    if (!given) { status = 'blank'; m = scoring.blank; blank++; }
    else if (given === q.correct_answer) { status = 'correct'; m = scoring.correct; correct++; }
    else { status = 'wrong'; m = scoring.wrong; wrong++; }
    marks += m;
    results.push({
      id: q.id,
      given,
      correct_answer: q.correct_answer,
      solution: q.solution ?? null,
      status,
      marks: m,
    });
  }

  const maxMarks = scoreable * scoring.correct;
  const pct = maxMarks === 0 ? 0 : Math.max(0, (marks / maxMarks) * 100);
  const score = scoreable === 0
    ? null
    : { correct, wrong, blank, scoreable, marks, maxMarks, pct, passed: pct >= passScore };

  return NextResponse.json({ results, score });
}
