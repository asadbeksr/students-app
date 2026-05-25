import { NextResponse } from 'next/server';
import { getSubject } from '@/config/subjects';
import { sampleExam } from '@/lib/exam/questions';
import type { AttemptConfig, Difficulty, ExamMode, LanguageFilter } from '@/types/exam';

export const dynamic = 'force-dynamic';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function sanitizeConfig(
  raw: Partial<AttemptConfig> | undefined,
  fallback: AttemptConfig,
): AttemptConfig {
  if (!raw) return fallback;
  const topics = Array.isArray(raw.topics) ? raw.topics.filter((t) => typeof t === 'string') : fallback.topics;
  const difficulties = Array.isArray(raw.difficulties)
    ? (raw.difficulties.filter((d) => DIFFICULTIES.includes(d as Difficulty)) as Difficulty[])
    : fallback.difficulties;
  const language: LanguageFilter =
    raw.language === 'en' || raw.language === 'it' || raw.language === 'any'
      ? raw.language
      : fallback.language;
  const count = Number.isFinite(raw.count) && (raw.count as number) > 0 ? Math.floor(raw.count as number) : fallback.count;
  const durationMin =
    Number.isFinite(raw.durationMin) && (raw.durationMin as number) > 0
      ? Math.floor(raw.durationMin as number)
      : fallback.durationMin;
  const scoring = raw.scoring && typeof raw.scoring === 'object' ? { ...fallback.scoring, ...raw.scoring } : fallback.scoring;
  const passScore = Number.isFinite(raw.passScore) ? (raw.passScore as number) : fallback.passScore;
  return {
    topics,
    difficulties,
    language,
    count,
    durationMin,
    shuffleQuestions: raw.shuffleQuestions ?? fallback.shuffleQuestions,
    shuffleOptions: raw.shuffleOptions ?? fallback.shuffleOptions,
    scoring,
    passScore,
    questionIds: Array.isArray(raw.questionIds) ? raw.questionIds.filter((id) => typeof id === 'string') : fallback.questionIds,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    subject?: string;
    mode?: string;
    config?: Partial<AttemptConfig>;
  };
  const { subject, mode, config } = body;
  if (!subject || !mode) return NextResponse.json({ error: 'Missing subject or mode' }, { status: 400 });

  const cfg = getSubject(subject);
  if (!cfg) return NextResponse.json({ error: 'Unknown subject' }, { status: 404 });

  const modeCfg = cfg.modes[mode as ExamMode];
  if (!modeCfg) return NextResponse.json({ error: 'Mode not available' }, { status: 404 });

  const fallback: AttemptConfig = {
    topics: [],
    difficulties: [],
    language: 'any',
    count: modeCfg.questionCount,
    durationMin: modeCfg.durationMin,
    shuffleQuestions: modeCfg.shuffle ?? true,
    shuffleOptions: false,
    scoring: modeCfg.scoring ?? { correct: 1, wrong: 0, blank: 0 },
    passScore: modeCfg.passScore ?? 60,
  };

  const resolved = sanitizeConfig(config, fallback);
  const questions = await sampleExam(cfg, mode as ExamMode, resolved);

  return NextResponse.json({
    questions,
    durationMin: resolved.durationMin,
    scoring: resolved.scoring,
    passScore: resolved.passScore,
    config: resolved,
    availablePool: questions.length,
  });
}
