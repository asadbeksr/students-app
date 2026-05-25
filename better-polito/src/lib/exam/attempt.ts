import type { Question, ScoringRules } from '@/types/exam';

export interface Attempt {
  subject: string;
  mode: string;
  startedAt: number;
  durationMin: number;
  questions: Question[];
  answers: Record<string, string>;
  flagged: Record<string, boolean>;
  submittedAt: number | null;
  scoring: ScoringRules;
  passScore: number;
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
  return Date.now() >= a.startedAt + a.durationMin * 60_000;
}

export function isFinished(a: Attempt): boolean {
  return a.submittedAt != null || isExpired(a);
}

export function remainingSeconds(a: Attempt): number {
  if (a.submittedAt) return 0;
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
  const { questions, answers, scoring, passScore } = a;
  let correct = 0, wrong = 0, blank = 0, scoreable = 0, marks = 0;
  for (const q of questions) {
    if (!q.correct_answer) continue;
    scoreable++;
    const ans = answers[q.id];
    if (!ans) { blank++; marks += scoring.blank; }
    else if (ans === q.correct_answer) { correct++; marks += scoring.correct; }
    else { wrong++; marks += scoring.wrong; }
  }
  if (scoreable === 0) return null;
  const maxMarks = scoreable * scoring.correct;
  const pct = maxMarks === 0 ? 0 : Math.max(0, (marks / maxMarks) * 100);
  return { correct, wrong, blank, scoreable, marks, maxMarks, pct, passed: pct >= passScore };
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
