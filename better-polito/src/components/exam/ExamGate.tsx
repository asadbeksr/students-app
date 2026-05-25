'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ExamMode, ModeConfig, SubjectConfig } from '@/types/exam';
import {
  type Attempt,
  type HistoryEntry,
  appendHistory,
  attemptToHistory,
  clearAttempt,
  isFinished,
  loadAttempt,
  loadHistory,
  saveAttempt,
} from '@/lib/exam/attempt';
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
      const entry = attemptToHistory(
        loaded.submittedAt ? loaded : { ...loaded, submittedAt: loaded.startedAt + loaded.durationMin * 60_000 },
      );
      if (entry) appendHistory(entry);
      clearAttempt(subject.slug, mode);
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
        const entry = attemptToHistory(next);
        if (entry) appendHistory(entry);
        clearAttempt(next.subject, next.mode);
      } else {
        saveAttempt(next);
      }
      return next;
    });
  }

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/exam/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.slug, mode }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const a: Attempt = {
        subject: subject.slug,
        mode,
        startedAt: Date.now(),
        durationMin: data.durationMin,
        questions: data.questions,
        answers: {},
        flagged: {},
        submittedAt: null,
        scoring: data.scoring,
        passScore: data.passScore,
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
    if (!confirm('Eliminare il tentativo corrente? Questa azione non può essere annullata.')) return;
    clearAttempt(subject.slug, mode);
    setAttempt(null);
  }

  if (attempt === undefined) {
    return <div className="exam-page-loading">Caricamento…</div>;
  }

  if (attempt === null) {
    return (
      <StartScreen
        subject={subject}
        mode={mode}
        modeCfg={modeCfg}
        onStart={start}
        starting={starting}
        error={error}
      />
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

function StartScreen({
  subject,
  mode,
  modeCfg,
  onStart,
  starting,
  error,
}: {
  subject: SubjectConfig;
  mode: ExamMode;
  modeCfg: ModeConfig;
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  const modeLabel = mode === 'mcq' ? 'Multiple choice' : 'Written';
  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />
      <div className="quiz-breadcrumb">
        <Link href="/mock">Mock exams</Link> <span>/</span>{' '}
        <Link href={`/mock/${subject.slug}`}>{subject.name}</Link> <span>/</span>{' '}
        <span>{modeLabel}</span>
      </div>
      <h1 className="quiz-title">
        <span className="quiz-icon" /> {subject.name} — {modeLabel} mock exam
      </h1>

      <div className="start-card">
        <h2>Riepilogo del quiz</h2>
        <table className="generaltable generalbox quizreviewsummary mb-0">
          <tbody>
            <tr>
              <th className="cell" scope="row">Numero di domande</th>
              <td className="cell">{modeCfg.questionCount}</td>
            </tr>
            <tr>
              <th className="cell" scope="row">Tempo</th>
              <td className="cell">{modeCfg.durationMin} min.</td>
            </tr>
            {modeCfg.scoring && (
              <tr>
                <th className="cell" scope="row">Punteggio</th>
                <td className="cell">
                  +{modeCfg.scoring.correct} corretta · {modeCfg.scoring.wrong} errata ·{' '}
                  {modeCfg.scoring.blank} in bianco
                </td>
              </tr>
            )}
            {modeCfg.passScore != null && (
              <tr>
                <th className="cell" scope="row">Soglia di superamento</th>
                <td className="cell">{modeCfg.passScore}%</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="start-note">
          Una volta avviato il tentativo, il timer parte e non puoi generare un nuovo set di
          domande finché il tempo non scade o non termini il tentativo.
        </div>

        {error && <div className="start-error">{error}</div>}

        <button
          type="button"
          className="btn btn-primary start-btn"
          onClick={onStart}
          disabled={starting}
        >
          {starting ? 'Avvio…' : 'Tenta il quiz ora'}
        </button>
      </div>

      <PastAttempts subject={subject.slug} mode={mode} />
    </div>
  );
}

function PastAttempts({ subject, mode }: { subject: string; mode: ExamMode }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    const list = loadHistory(subject, mode).sort((a, b) => b.startedAt - a.startedAt);
    setEntries(list);
  }, [subject, mode]);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="start-card" style={{ marginTop: '1.5rem' }}>
      <h2>I tuoi tentativi precedenti</h2>
      <table className="generaltable generalbox quizattemptsummary mb-0">
        <thead>
          <tr>
            <th className="cell" scope="col">Tentativo</th>
            <th className="cell" scope="col">Stato</th>
            <th className="cell" scope="col">Iniziato</th>
            <th className="cell" scope="col">Terminato</th>
            <th className="cell" scope="col">Tempo impiegato</th>
            <th className="cell" scope="col">Valutazione</th>
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
                <td className="cell">Completato</td>
                <td className="cell">{formatItDate(started)}</td>
                <td className="cell">{formatItDate(finished)}</td>
                <td className="cell">{formatDuration(elapsedSec)}</td>
                <td className="cell">
                  {e.score ? (
                    <>
                      <b>{formatIt(e.score.marks)}</b> su {formatIt(e.score.maxMarks)} (
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
const IT_DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const IT_MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];
function formatItDate(d: Date): string {
  return `${IT_DAYS[d.getDay()]}, ${d.getDate()} ${IT_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
