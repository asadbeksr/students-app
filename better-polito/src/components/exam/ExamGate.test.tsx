// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ModeConfig, RunnerQuestion, SubjectConfig } from '@/types/exam';
import { db } from '@/lib/db';
import { ExamGate } from './ExamGate';

const subject: SubjectConfig = {
  slug: 'math',
  name: 'Mathematics',
  folder: 'math',
  modes: {},
};

const modeCfg: ModeConfig = {
  questionCount: 1,
  durationMin: 0, // untimed — keeps the runner's countdown out of the test
  scoring: { correct: 1, wrong: 0, blank: 0 },
  passScore: 60,
};

const question: RunnerQuestion = {
  id: 'q1',
  exam_type: 'mcq',
  question_number: 1,
  question_text: 'What is 2 + 2?',
  options: [
    { label: 'A', text: '3' },
    { label: 'B', text: '4' },
  ],
  difficulty: 'easy',
  topics: ['arithmetic'],
  has_formula: false,
  has_diagram: false,
  language: 'en',
  year: 2024,
  subject: 'math',
  original_question_image: null,
  question_image: null,
};

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/exam/facets')) {
      return jsonResponse({
        total: 1,
        topics: [],
        sourceFiles: [],
        difficulties: { easy: 1, medium: 0, hard: 0 },
        languages: { en: 1, it: 0 },
        catalog: [
          { id: 'q1', topics: ['arithmetic'], source_file: 'a.pdf', difficulty: 'easy', language: 'en' },
        ],
      });
    }
    if (url.includes('/api/exam/sample')) {
      return jsonResponse({
        startedAt: Date.now(),
        durationMin: 0,
        questions: [question],
        scoring: { correct: 1, wrong: 0, blank: 0 },
        passScore: 60,
        attemptToken: 'test-token',
      });
    }
    if (url.includes('/api/exam/grade')) {
      return jsonResponse({
        results: [
          { id: 'q1', given: 'A', correct_answer: 'B', solution: '2 + 2 = 4', status: 'wrong', marks: 0 },
        ],
        score: { correct: 0, wrong: 1, blank: 0, scoreable: 1, marks: 0, maxMarks: 1, pct: 0, passed: false },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

beforeEach(async () => {
  await Promise.all([db.examAttempts.clear(), db.examHistory.clear(), db.examConfigs.clear()]);
  vi.stubGlobal('fetch', mockFetch());
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ExamGate full flow', () => {
  it('configures, starts, answers, submits and reviews — persisting to Dexie', async () => {
    const user = userEvent.setup();
    render(<ExamGate subject={subject} mode="mcq" modeCfg={modeCfg} />);

    // ── Configure → Start ──────────────────────────────────────────────
    const startButton = await screen.findByRole('button', { name: /start/i });
    await waitFor(() => expect(startButton).toBeEnabled());
    await user.click(startButton);

    // ── Runner appears with the sampled question ───────────────────────
    expect(await screen.findByText('What is 2 + 2?')).toBeInTheDocument();
    // The active attempt was persisted to Dexie before/while the runner mounted.
    await waitFor(async () => expect(await db.examAttempts.count()).toBe(1));

    // ── Answer a question ──────────────────────────────────────────────
    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]);
    await waitFor(async () => {
      const stored = await db.examAttempts.get('math:mcq');
      expect(stored?.attempt.answers).toEqual({ q1: 'A' });
    });

    // ── Submit → grade → review ────────────────────────────────────────
    await user.click(screen.getByRole('button', { name: /finish attempt/i }));

    expect(await screen.findByText('Completed')).toBeInTheDocument();

    // Submitting moves the attempt from the active store into history.
    await waitFor(async () => {
      expect(await db.examAttempts.count()).toBe(0);
      expect(await db.examHistory.count()).toBe(1);
    });

    // The graded feedback (correct answer) is shown in review mode.
    expect(screen.getByText(/The correct answer is:/i)).toBeInTheDocument();
  });

  it('lists a past attempt and reopens it for review from history', async () => {
    // Seed one finished attempt directly into the history store.
    await db.examHistory.put({
      id: '4242',
      subject: 'math',
      mode: 'mcq',
      startedAt: 4242,
      attempt: {
        subject: 'math',
        mode: 'mcq',
        startedAt: 4242,
        durationMin: 0,
        questions: [question],
        answers: { q1: 'B' },
        flagged: {},
        submittedAt: 5000,
        scoring: { correct: 1, wrong: 0, blank: 0 },
        passScore: 60,
        gradeScore: { correct: 1, wrong: 0, blank: 0, scoreable: 1, marks: 1, maxMarks: 1, pct: 100, passed: true },
        graded: { q1: { id: 'q1', given: 'B', correct_answer: 'B', solution: 'ok', status: 'correct', marks: 1 } },
      },
    });

    const user = userEvent.setup();
    render(<ExamGate subject={subject} mode="mcq" modeCfg={modeCfg} />);

    // The previous-attempts table renders the seeded entry.
    const previous = await screen.findByText('Your previous attempts');
    const table = previous.parentElement!.querySelector('table')!;
    const reviewButton = within(table).getByRole('button', { name: /review/i });
    await user.click(reviewButton);

    // Clicking Review loads the full attempt from Dexie and shows it.
    expect(await screen.findByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
