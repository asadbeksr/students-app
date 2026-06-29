import { db } from '@/lib/db';
import type { GradedResult, RunnerQuestion, ScoringRules } from '@/types/exam';

export interface AttemptConfigSummary {
  sourceFiles: string[];
  topics: string[];
  language?: string;
}

export interface Attempt {
  subject: string;
  mode: string;
  startedAt: number;
  durationMin: number;
  questions: RunnerQuestion[];
  answers: Record<string, string>;
  flagged: Record<string, boolean>;
  submittedAt: number | null;
  scoring: ScoringRules;
  passScore: number;
  attemptToken?: string;
  graded?: Record<string, GradedResult>;
  gradeScore?: AttemptScore | null;
  config?: AttemptConfigSummary;
}

function prettySource(name: string): string {
  return name.replace(/\.(pdf|png|jpe?g)$/i, '').replace(/_/g, ' ').trim();
}

export function attemptLabel(cfg: AttemptConfigSummary | undefined): string | null {
  if (!cfg) return null;
  const parts: string[] = [];
  if (cfg.sourceFiles.length === 1) parts.push(prettySource(cfg.sourceFiles[0]));
  else if (cfg.sourceFiles.length > 1) parts.push(`${cfg.sourceFiles.length} sources`);
  if (cfg.topics.length === 1) parts.push(cfg.topics[0]);
  else if (cfg.topics.length > 1) parts.push(`${cfg.topics.length} topics`);
  return parts.length ? parts.join(' · ') : null;
}

function activeKey(subject: string, mode: string) {
  return `${subject}:${mode}`;
}

export async function loadAttempt(subject: string, mode: string): Promise<Attempt | null> {
  if (typeof window === 'undefined') return null;
  try {
    const row = await db.examAttempts.get(activeKey(subject, mode));
    return row?.attempt ?? null;
  } catch {
    return null;
  }
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  if (typeof window === 'undefined') return;
  await db.examAttempts.put({ id: activeKey(attempt.subject, attempt.mode), attempt });
}

export async function clearAttempt(subject: string, mode: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await db.examAttempts.delete(activeKey(subject, mode));
}

export function isExpired(a: Attempt): boolean {
  if (a.durationMin === 0) return false;
  return Date.now() >= a.startedAt + a.durationMin * 60_000;
}

export function isFinished(a: Attempt): boolean {
  return a.submittedAt != null || isExpired(a);
}

export function remainingSeconds(a: Attempt): number {
  if (a.submittedAt) return 0;
  if (a.durationMin === 0) return Infinity;
  const left = a.startedAt + a.durationMin * 60_000 - Date.now();
  return Math.max(0, Math.floor(left / 1000));
}

export interface AttemptScore {
  correct: number;
  wrong: number;
  blank: number;
  scoreable: number;
  marks: number;
  maxMarks: number;
  pct: number;
  passed: boolean;
}

export function computeScore(a: Attempt): AttemptScore | null {
  return a.gradeScore ?? null;
}

export interface HistoryEntry {
  id: string;
  subject: string;
  mode: string;
  startedAt: number;
  submittedAt: number;
  durationMin: number;
  totalQuestions: number;
  score: AttemptScore | null;
  label?: string | null;
}

export async function loadHistory(subject: string, mode: string): Promise<HistoryEntry[]> {
  if (typeof window === 'undefined') return [];
  try {
    const rows = await db.examHistory.where('[subject+mode]').equals([subject, mode]).toArray();
    return rows
      .map((r) => attemptToHistory(r.attempt))
      .filter((e): e is HistoryEntry => e != null);
  } catch {
    return [];
  }
}

export function attemptToHistory(a: Attempt): HistoryEntry | null {
  if (!a.submittedAt) return null;
  return {
    id: String(a.startedAt),
    subject: a.subject,
    mode: a.mode,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    durationMin: a.durationMin,
    totalQuestions: a.questions.length,
    score: computeScore(a),
    label: attemptLabel(a.config),
  };
}

export async function saveHistoricalAttempt(a: Attempt): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!a.submittedAt) return;
  await db.examHistory.put({
    id: String(a.startedAt),
    subject: a.subject,
    mode: a.mode,
    startedAt: a.startedAt,
    attempt: a,
  });
}

export async function loadHistoricalAttempt(id: string): Promise<Attempt | null> {
  if (typeof window === 'undefined') return null;
  try {
    const row = await db.examHistory.get(id);
    return row?.attempt ?? null;
  } catch {
    return null;
  }
}

