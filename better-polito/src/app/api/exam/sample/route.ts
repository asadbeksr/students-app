import { NextResponse } from 'next/server';
import { getSubject } from '@/config/subjects';
import { sampleExam } from '@/lib/exam/questions';
import type { ExamMode } from '@/types/exam';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { subject, mode } = (await req.json()) as { subject?: string; mode?: string };
  if (!subject || !mode) return NextResponse.json({ error: 'Missing subject or mode' }, { status: 400 });

  const cfg = getSubject(subject);
  if (!cfg) return NextResponse.json({ error: 'Unknown subject' }, { status: 404 });

  const modeCfg = cfg.modes[mode as ExamMode];
  if (!modeCfg) return NextResponse.json({ error: 'Mode not available' }, { status: 404 });

  const questions = await sampleExam(cfg, mode as ExamMode, modeCfg.questionCount, modeCfg.shuffle ?? true);
  return NextResponse.json({
    questions,
    durationMin: modeCfg.durationMin,
    scoring: modeCfg.scoring ?? { correct: 1, wrong: 0, blank: 0 },
    passScore: modeCfg.passScore ?? 60,
  });
}
