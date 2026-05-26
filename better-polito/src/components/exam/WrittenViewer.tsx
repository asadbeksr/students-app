'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SubjectConfig } from '@/types/exam';
import { type Attempt, isFinished, remainingSeconds } from '@/lib/exam/attempt';
import { MathText } from './MathText';
import { ListChecks } from 'lucide-react';

interface Props {
  subject: SubjectConfig;
  attempt: Attempt;
  onUpdate: (updater: (a: Attempt) => Attempt) => void;
  onDiscard: () => void;
}

export function WrittenViewer({ subject, attempt, onUpdate, onDiscard }: Props) {
  const finished = isFinished(attempt);
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(attempt));
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const tickRef = useRef<number | null>(null);

  async function revealSolution(qId: string) {
    if (revealed[qId] || !attempt.attemptToken) return;
    try {
      const res = await fetch('/api/exam/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptToken: attempt.attemptToken, questionId: qId }),
      });
      if (!res.ok) return;
      const data = await res.json() as { solution: string | null };
      if (data.solution) setRevealed((r) => ({ ...r, [qId]: data.solution as string }));
    } catch {}
  }

  useEffect(() => {
    if (finished) { setSecondsLeft(0); return; }
    setSecondsLeft(remainingSeconds(attempt));
    tickRef.current = window.setInterval(() => {
      const left = remainingSeconds(attempt);
      setSecondsLeft(left);
      if (left <= 0) {
        if (tickRef.current) window.clearInterval(tickRef.current);
        onUpdate((a) => (a.submittedAt ? a : { ...a, submittedAt: a.startedAt + a.durationMin * 60_000 }));
      }
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [attempt, finished, onUpdate]);

  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />

      <div className="quiz-breadcrumb">
        <Link href="/mock">Mock exams</Link> <span>/</span>{' '}
        <Link href={`/mock/${subject.slug}`}>{subject.name}</Link> <span>/</span>{' '}
        <span>Written</span>
      </div>

      <h1 className="quiz-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ListChecks size={32} strokeWidth={2} style={{ color: '#f7941d' }} />
        <span>{subject.name} — Written mock exam</span>
      </h1>

      <div className="quiz-status-bar">
        {!finished ? (
          <div className={`timer ${secondsLeft < 60 ? 'timer-danger' : ''}`}>
            Time remaining: <strong>{formatTime(secondsLeft)}</strong>
          </div>
        ) : (
          <div className="timer">Time up / attempt finished</div>
        )}
        <button type="button" className="link-danger" onClick={onDiscard}>
          {finished ? 'Start new attempt' : 'Delete attempt'}
        </button>
      </div>

      <div className="quiz-layout">
        <main className="quiz-main">
          {attempt.questions.map((q, idx) => {
            const solution = revealed[q.id];
            return (
              <div key={q.id} id={`question-${q.id}`} className="que essay">
                <div className="info">
                  <h3 className="no">Question <span className="qno">{idx + 1}</span></h3>
                </div>
                <div className="content">
                  <div className="formulation clearfix">
                    <h4 className="accesshide">Question text</h4>
                    <div className="qtext"><MathText text={q.question_text} /></div>
                    {q.question_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={q.question_image} alt="" className="img-responsive" style={{ maxWidth: '100%', marginTop: 12 }} />
                    )}
                  </div>
                  <div className={`outcome clearfix ${solution ? '' : 'solution-hidden'}`}>
                    {!solution ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void revealSolution(q.id)}
                      >
                        Show solution
                      </button>
                    ) : (
                      <div className="feedback">
                        <div className="rightanswer">Solution</div>
                        <div className="generalfeedback" style={{ marginTop: 8 }}>
                          <MathText text={solution} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </main>

        <aside className="quiz-nav-side">
          <div className="card-block">
            <h3>Quiz navigation</h3>
            <div className="qn_buttons clearfix allquestionsononepage">
              {attempt.questions.map((q, idx) => (
                <a
                  key={q.id}
                  href={`#question-${q.id}`}
                  className={`qnbutton ${revealed[q.id] ? 'answersaved' : 'notyetanswered'} btn`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {idx + 1}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}
function pad(n: number) { return n.toString().padStart(2, '0'); }
