import { NextResponse } from 'next/server';
import { verifyAttempt } from '@/lib/exam/token';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    attemptToken?: string;
    questionId?: string;
  };
  if (!body.attemptToken || !body.questionId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
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
  const q = payload.questions.find((x) => x.id === body.questionId);
  if (!q) return NextResponse.json({ error: 'Unknown question' }, { status: 404 });
  return NextResponse.json({
    id: q.id,
    correct_answer: q.correct_answer ?? null,
    solution: q.solution ?? null,
  });
}
