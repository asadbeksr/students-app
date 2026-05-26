import type { GradedResult, RunnerQuestion, ScoringRules } from '@/types/exam';

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
}

function key(subject: string, mode: string) {
  return `mock-attempt:${subject}:${mode}`;
}

export function loadAttempt(subject: string, mode: string): Attempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(subject, mode));
    if (!raw) return null;
    return JSON.parse(raw) as Attempt;
  } catch {
    return null;
  }
}

export function saveAttempt(attempt: Attempt) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(attempt.subject, attempt.mode), JSON.stringify(attempt));
}

export function clearAttempt(subject: string, mode: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key(subject, mode));
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
}

function historyKey(subject: string, mode: string) {
  return `mock-history:${subject}:${mode}`;
}

export function loadHistory(subject: string, mode: string): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(historyKey(subject, mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry) {
  if (typeof window === 'undefined') return;
  const list = loadHistory(entry.subject, entry.mode);
  if (list.some((e) => e.id === entry.id)) return;
  list.push(entry);
  window.localStorage.setItem(historyKey(entry.subject, entry.mode), JSON.stringify(list));
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
  };
}

export function saveHistoricalAttempt(a: Attempt) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`mock-attempt-history-data:${a.startedAt}`, JSON.stringify(a));
}

export function loadHistoricalAttempt(id: string): Attempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`mock-attempt-history-data:${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Attempt;
  } catch {
    return null;
  }
}

