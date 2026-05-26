'use client';
import { useEffect, useState } from 'react';
import type { AttemptConfig, ExamMode, ModeConfig, SubjectConfig } from '@/types/exam';
import {
  type Attempt,
  type AttemptScore,
  type HistoryEntry,
  appendHistory,
  attemptToHistory,
  clearAttempt,
  isFinished,
  loadAttempt,
  loadHistory,
  saveAttempt,
  saveHistoricalAttempt,
  loadHistoricalAttempt,
} from '@/lib/exam/attempt';
import { ConfigScreen } from './ConfigScreen';
import { McqRunner } from './McqRunner';
import { WrittenViewer } from './WrittenViewer';

interface Props {
  subject: SubjectConfig;
  mode: ExamMode;
  modeCfg: ModeConfig;
}

export function ExamGate({ subject, mode, modeCfg }: Props) {
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadAttempt(subject.slug, mode);
    if (loaded && isFinished(loaded)) {
      const finishedA = loaded.submittedAt ? loaded : { ...loaded, submittedAt: loaded.startedAt + loaded.durationMin * 60_000 };
      void gradeAndPersist(finishedA);
      setAttempt(null);
      return;
    }
    setAttempt(loaded);
  }, [subject.slug, mode]);

  function update(updater: (a: Attempt) => Attempt) {
    setAttempt((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (!prev.submittedAt && next.submittedAt) {
        void gradeAndPersist(next);
        return next;
      }
      saveAttempt(next);
      return next;
    });
  }

  async function gradeAndPersist(a: Attempt) {
    let graded: Record<string, import('@/types/exam').GradedResult> | undefined;
    let gradeScore: AttemptScore | null | undefined;
    if (a.attemptToken) {
      try {
        const res = await fetch('/api/exam/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptToken: a.attemptToken, answers: a.answers }),
        });
        if (res.ok) {
          const data = await res.json() as { results: import('@/types/exam').GradedResult[]; score: AttemptScore | null };
          graded = Object.fromEntries(data.results.map((r) => [r.id, r]));
          gradeScore = data.score;
        }
      } catch {}
    }
    const finalA: Attempt = { ...a, graded, gradeScore };
    const entry = attemptToHistory(finalA);
    if (entry) {
      appendHistory(entry);
      saveHistoricalAttempt(finalA);
    }
    clearAttempt(finalA.subject, finalA.mode);
    setAttempt(finalA);
  }

  function reviewPastAttempt(id: string) {
    const loaded = loadHistoricalAttempt(id);
    if (loaded) {
      setAttempt(loaded);
    } else {
      alert("Attempt data not found (it might be from an older version).");
    }
  }

  async function start(config: AttemptConfig) {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/exam/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.slug, mode, config }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const a: Attempt = {
        subject: subject.slug,
        mode,
        startedAt: data.startedAt ?? Date.now(),
        durationMin: data.durationMin,
        questions: data.questions,
        answers: {},
        flagged: {},
        submittedAt: null,
        scoring: data.scoring,
        passScore: data.passScore,
        attemptToken: data.attemptToken,
      };
      saveAttempt(a);
      setAttempt(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setStarting(false);
    }
  }

  function discard() {
    if (attempt && !isFinished(attempt)) {
      if (!confirm('Delete current attempt? This action cannot be undone.')) return;
    }
    clearAttempt(subject.slug, mode);
    setAttempt(null);
  }

  if (attempt === undefined) {
    return <div className="exam-page-loading">Loading…</div>;
  }

  if (attempt === null) {
    return (
      <>
        <ConfigScreen
          subject={subject}
          mode={mode}
          modeCfg={modeCfg}
          onStart={start}
          starting={starting}
          error={error}
        />
        <div className="moodle-quiz" style={{ paddingTop: 0 }}>
          <PastAttempts subject={subject.slug} mode={mode} onReview={reviewPastAttempt} />
        </div>
      </>
    );
  }

  // Attempt exists. If it's finished (expired or submitted), runner shows in review mode.
  if (mode === 'mcq') {
    return (
      <McqRunner
        subject={subject}
        attempt={attempt}
        onUpdate={update}
        onDiscard={discard}
      />
    );
  }
  return (
    <WrittenViewer
      subject={subject}
      attempt={attempt}
      onUpdate={update}
      onDiscard={discard}
    />
  );
}

function PastAttempts({ subject, mode, onReview }: { subject: string; mode: ExamMode; onReview: (id: string) => void }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    const list = loadHistory(subject, mode).sort((a, b) => b.startedAt - a.startedAt);
    setEntries(list);
  }, [subject, mode]);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="start-card" style={{ marginTop: '1.5rem' }}>
      <h2>Your previous attempts</h2>
      <table className="generaltable generalbox quizattemptsummary mb-0">
        <thead>
          <tr>
            <th className="cell" scope="col">Attempt</th>
            <th className="cell" scope="col">Status</th>
            <th className="cell" scope="col">Started</th>
            <th className="cell" scope="col">Finished</th>
            <th className="cell" scope="col">Time taken</th>
            <th className="cell" scope="col">Grade</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => {
            const started = new Date(e.startedAt);
            const finished = new Date(e.submittedAt);
            const elapsedSec = Math.floor((e.submittedAt - e.startedAt) / 1000);
            const num = entries.length - idx;
            return (
              <tr key={e.id}>
                <td className="cell">{num}</td>
                <td className="cell">
                  <button type="button" className="link-btn" style={{ fontWeight: 'bold' }} onClick={() => onReview(e.id)}>
                    Review
                  </button>
                </td>
                <td className="cell">{formatItDate(started)}</td>
                <td className="cell">{formatItDate(finished)}</td>
                <td className="cell">{formatDuration(elapsedSec)}</td>
                <td className="cell">
                  {e.score ? (
                    <>
                      <b>{formatIt(e.score.marks)}</b> out of {formatIt(e.score.maxMarks)} (
                      <b>{Math.round(e.score.pct)}</b>%)
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function formatIt(n: number): string {
  return n.toFixed(2).replace('.', ',');
}
function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec} sec.`;
  const m = Math.floor(totalSec / 60);
  if (m < 60) return `${m} min.`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h} h` : `${h} h ${mm} min.`;
}
const IT_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const IT_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
function formatItDate(d: Date): string {
  return `${IT_DAYS[d.getDay()]}, ${d.getDate()} ${IT_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
