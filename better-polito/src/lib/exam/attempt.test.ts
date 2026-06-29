import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import {
  type Attempt,
  attemptLabel,
  attemptToHistory,
  clearAttempt,
  computeScore,
  isExpired,
  isFinished,
  loadAttempt,
  loadHistory,
  loadHistoricalAttempt,
  remainingSeconds,
  saveAttempt,
  saveHistoricalAttempt,
} from './attempt';

function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    subject: 'math',
    mode: 'mcq',
    startedAt: 1_000,
    durationMin: 30,
    questions: [],
    answers: {},
    flagged: {},
    submittedAt: null,
    scoring: { correct: 1, wrong: 0, blank: 0 },
    passScore: 60,
    ...overrides,
  };
}

beforeEach(async () => {
  await Promise.all([
    db.examAttempts.clear(),
    db.examHistory.clear(),
    db.examConfigs.clear(),
  ]);
});

describe('active attempt persistence', () => {
  it('round-trips save → load', async () => {
    const a = makeAttempt({ answers: { q1: 'A' } });
    await saveAttempt(a);
    const loaded = await loadAttempt('math', 'mcq');
    expect(loaded).toEqual(a);
  });

  it('returns null when no attempt is stored', async () => {
    expect(await loadAttempt('math', 'mcq')).toBeNull();
  });

  it('keeps subject+mode pairs isolated', async () => {
    await saveAttempt(makeAttempt({ subject: 'math', mode: 'mcq' }));
    await saveAttempt(makeAttempt({ subject: 'chem', mode: 'written' }));
    expect((await loadAttempt('math', 'mcq'))?.subject).toBe('math');
    expect((await loadAttempt('chem', 'written'))?.mode).toBe('written');
    expect(await loadAttempt('math', 'written')).toBeNull();
  });

  it('overwrites the same subject+mode (single active attempt)', async () => {
    await saveAttempt(makeAttempt({ startedAt: 1 }));
    await saveAttempt(makeAttempt({ startedAt: 2 }));
    expect((await loadAttempt('math', 'mcq'))?.startedAt).toBe(2);
    expect(await db.examAttempts.count()).toBe(1);
  });

  it('clears an attempt', async () => {
    await saveAttempt(makeAttempt());
    await clearAttempt('math', 'mcq');
    expect(await loadAttempt('math', 'mcq')).toBeNull();
  });
});

describe('history persistence', () => {
  it('only archives submitted attempts', async () => {
    await saveHistoricalAttempt(makeAttempt({ submittedAt: null }));
    expect(await db.examHistory.count()).toBe(0);

    await saveHistoricalAttempt(makeAttempt({ submittedAt: 2_000 }));
    expect(await db.examHistory.count()).toBe(1);
  });

  it('round-trips a full historical attempt by id', async () => {
    const a = makeAttempt({ startedAt: 4_242, submittedAt: 5_000 });
    await saveHistoricalAttempt(a);
    const loaded = await loadHistoricalAttempt('4242');
    expect(loaded).toEqual(a);
  });

  it('derives history summaries filtered by subject+mode', async () => {
    await saveHistoricalAttempt(makeAttempt({ subject: 'math', mode: 'mcq', startedAt: 1, submittedAt: 10 }));
    await saveHistoricalAttempt(makeAttempt({ subject: 'math', mode: 'mcq', startedAt: 2, submittedAt: 20 }));
    await saveHistoricalAttempt(makeAttempt({ subject: 'chem', mode: 'mcq', startedAt: 3, submittedAt: 30 }));

    const mathHistory = await loadHistory('math', 'mcq');
    expect(mathHistory).toHaveLength(2);
    expect(mathHistory.every((e) => e.subject === 'math')).toBe(true);
    expect(new Set(mathHistory.map((e) => e.id))).toEqual(new Set(['1', '2']));
  });

  it('returns an empty list when no history exists', async () => {
    expect(await loadHistory('math', 'mcq')).toEqual([]);
  });
});

describe('pure helpers', () => {
  it('attemptToHistory returns null until submitted', () => {
    expect(attemptToHistory(makeAttempt({ submittedAt: null }))).toBeNull();
    const entry = attemptToHistory(makeAttempt({ startedAt: 7, submittedAt: 8 }));
    expect(entry).toMatchObject({ id: '7', startedAt: 7, submittedAt: 8 });
  });

  it('isExpired treats durationMin 0 as untimed', () => {
    expect(isExpired(makeAttempt({ durationMin: 0 }))).toBe(false);
  });

  it('isExpired is true once the window elapses', () => {
    const past = makeAttempt({ startedAt: Date.now() - 60 * 60_000, durationMin: 30 });
    expect(isExpired(past)).toBe(true);
    const future = makeAttempt({ startedAt: Date.now(), durationMin: 30 });
    expect(isExpired(future)).toBe(false);
  });

  it('isFinished reflects submission or expiry', () => {
    expect(isFinished(makeAttempt({ submittedAt: 1 }))).toBe(true);
    expect(isFinished(makeAttempt({ startedAt: Date.now() - 60 * 60_000, durationMin: 1 }))).toBe(true);
    expect(isFinished(makeAttempt({ startedAt: Date.now(), durationMin: 30 }))).toBe(false);
  });

  it('remainingSeconds is 0 after submission and Infinity when untimed', () => {
    expect(remainingSeconds(makeAttempt({ submittedAt: 1 }))).toBe(0);
    expect(remainingSeconds(makeAttempt({ durationMin: 0 }))).toBe(Infinity);
  });

  it('computeScore mirrors gradeScore', () => {
    expect(computeScore(makeAttempt())).toBeNull();
    const score = {
      correct: 3, wrong: 1, blank: 0, scoreable: 4, marks: 3, maxMarks: 4, pct: 75, passed: true,
    };
    expect(computeScore(makeAttempt({ gradeScore: score }))).toEqual(score);
  });

  it('attemptLabel summarises sources and topics', () => {
    expect(attemptLabel(undefined)).toBeNull();
    expect(attemptLabel({ sourceFiles: [], topics: [] })).toBeNull();
    expect(attemptLabel({ sourceFiles: ['Lecture_1.pdf'], topics: ['Limits'] })).toBe('Lecture 1 · Limits');
    expect(attemptLabel({ sourceFiles: ['a.pdf', 'b.pdf'], topics: ['x', 'y', 'z'] })).toBe('2 sources · 3 topics');
  });
});
