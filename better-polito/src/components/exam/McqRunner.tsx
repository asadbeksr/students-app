'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Question, ScoringRules, SubjectConfig } from '@/types/exam';
import { type Attempt, isFinished, remainingSeconds } from '@/lib/exam/attempt';
import { MathText } from './MathText';

interface Props {
  subject: SubjectConfig;
  attempt: Attempt;
  onUpdate: (updater: (a: Attempt) => Attempt) => void;
  onDiscard: () => void;
}

export function McqRunner({ subject, attempt, onUpdate, onDiscard }: Props) {
  const finished = isFinished(attempt);
  const isChemistry = subject.slug.toLowerCase() === 'chemistry';
  const infoCount = isChemistry ? 3 : 0;
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(attempt));
  const [currentIdx, setCurrentIdx] = useState(() => isChemistry ? -3 : 0);
  const [isTimerHidden, setIsTimerHidden] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (finished) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(remainingSeconds(attempt));
    tickRef.current = window.setInterval(() => {
      const left = remainingSeconds(attempt);
      setSecondsLeft(left);
      if (left <= 0) {
        if (tickRef.current) window.clearInterval(tickRef.current);
        onUpdate((a) => (a.submittedAt ? a : { ...a, submittedAt: a.startedAt + a.durationMin * 60_000 }));
      }
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [attempt, finished, onUpdate]);

  function submit() {
    onUpdate((a) => ({ ...a, submittedAt: Date.now() }));
  }
  function selectAnswer(qId: string, label: string) {
    if (finished) return;
    onUpdate((a) => ({ ...a, answers: { ...a.answers, [qId]: label } }));
  }
  function toggleFlag(qId: string) {
    onUpdate((a) => ({ ...a, flagged: { ...a.flagged, [qId]: !a.flagged[qId] } }));
  }

  const score = useMemo(() => {
    if (!finished) return null;
    const { questions, answers, scoring, passScore } = attempt;
    let correct = 0, wrong = 0, blank = 0, scoreable = 0, marks = 0;
    for (const item of questions) {
      if (!item.correct_answer) continue;
      scoreable++;
      const ans = answers[item.id];
      if (!ans) { blank++; marks += scoring.blank; }
      else if (ans === item.correct_answer) { correct++; marks += scoring.correct; }
      else { wrong++; marks += scoring.wrong; }
    }
    const maxMarks = scoreable * scoring.correct;
    const pct = maxMarks === 0 ? 0 : Math.max(0, (marks / maxMarks) * 100);
    return { correct, wrong, blank, scoreable, marks, maxMarks, pct, passed: pct >= passScore };
  }, [finished, attempt]);

  const modeLabel = 'Multiple choice';
  const startedAt = new Date(attempt.startedAt);
  const finishedAt = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
  const elapsedSec = finishedAt
    ? Math.floor((finishedAt.getTime() - attempt.startedAt) / 1000)
    : attempt.durationMin * 60 - secondsLeft;

  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />

      <div className="quiz-header-toggle-container">
        <button className="moodle-drawer-toggle" aria-label="Toggle drawer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>

        <div className="quiz-breadcrumb">
          <Link href="/mock">2026_06KWRXQ_3</Link> <span>/</span>{' '}
          <Link href={`/mock/${subject.slug}`}>General</Link> <span>/</span>{' '}
          <span>First trial of self evaluation</span>
        </div>
      </div>

      <h1 className="quiz-title">
        <span className="quiz-icon" /> First trial of self evaluation
      </h1>

      <div className="quiz-action-bar">
        <Link href="/mock" className="btn btn-secondary btn-back">
          Back
        </Link>
      </div>

      {finished && score && (
        <table className="generaltable generalbox quizreviewsummary mb-0">
          <caption className="sr-only">Riepilogo del tentativo</caption>
          <tbody>
            <tr><th className="cell" scope="row">Stato</th><td className="cell">Completato</td></tr>
            <tr><th className="cell" scope="row">Iniziato</th><td className="cell">{formatItDate(startedAt)}</td></tr>
            <tr><th className="cell" scope="row">Terminato</th><td className="cell">{formatItDate(finishedAt ?? new Date())}</td></tr>
            <tr><th className="cell" scope="row">Tempo impiegato</th><td className="cell">{formatDuration(elapsedSec)}</td></tr>
            <tr>
              <th className="cell" scope="row">Valutazione</th>
              <td className="cell">
                <b>{formatIt(score.marks)}</b> su un massimo di {formatIt(score.maxMarks)} (<b>{Math.round(score.pct)}</b>%)
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="quiz-layout">
        <main className="quiz-main">
          {!finished && (
            <div className="moodle-timer-row">
              <div className="moodle-timer-wrapper">
                <div className={`moodle-timer-box ${secondsLeft < 60 ? 'timer-danger' : ''}`} style={{ visibility: isTimerHidden ? 'hidden' : 'visible' }}>
                  Time left <strong className="moodle-timer-value">{formatTime(secondsLeft)}</strong>
                </div>
                <button type="button" className="btn btn-secondary timer-toggle-btn" onClick={() => setIsTimerHidden(!isTimerHidden)}>
                  {isTimerHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            </div>
          )}

          {finished ? (
            <>
              {isChemistry && (
                <div className="que info-block" style={{ marginBottom: '1.8em' }}>
                  <div className="info">
                    <h3 className="no">Information</h3>
                    <div className="state-text">Info question</div>
                  </div>
                  <div className="content">
                    <div className="formulation clearfix">
                      <div className="qtext" style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                        Periodic Table of the Elements
                      </div>
                      <img
                        src="/moodle/periodic_table.png"
                        alt="Periodic Table of the Elements"
                        style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid #dee2e6' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {attempt.questions.map((q, idx) => (
                <QuestionBlock
                  key={`${idx}-${q.id}`}
                  q={q}
                  index={idx}
                  selected={attempt.answers[q.id]}
                  flagged={!!attempt.flagged[q.id]}
                  finished={finished}
                  scoring={attempt.scoring}
                  onSelect={(label) => selectAnswer(q.id, label)}
                  onFlag={() => toggleFlag(q.id)}
                />
              ))}
            </>
          ) : currentIdx < 0 ? (
            <div className="que info-block">
              <div className="info">
                <h3 className="no">Information</h3>
                <div className="state-text">Info question</div>
              </div>
              <div className="content">
                <div className="formulation clearfix">
                  <div className="qtext" style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                    Periodic Table of the Elements
                  </div>
                  <img
                    src="/moodle/periodic_table.png"
                    alt="Periodic Table of the Elements"
                    style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid #dee2e6' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            (() => {
              const idx = Math.min(currentIdx, attempt.questions.length - 1);
              const q = attempt.questions[idx];
              return (
                <QuestionBlock
                  key={`${idx}-${q.id}`}
                  q={q}
                  index={idx}
                  selected={attempt.answers[q.id]}
                  flagged={!!attempt.flagged[q.id]}
                  finished={finished}
                  scoring={attempt.scoring}
                  onSelect={(label) => selectAnswer(q.id, label)}
                  onFlag={() => toggleFlag(q.id)}
                />
              );
            })()
          )}

          {!finished && (
            <div className="page-nav">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentIdx((i) => Math.max(-infoCount, i - 1))}
                disabled={currentIdx === -infoCount}
              >
                Previous page
              </button>
              {currentIdx < attempt.questions.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentIdx((i) => Math.min(attempt.questions.length - 1, i + 1))}
                >
                  Next page
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (confirm('Terminare il tentativo? Vedrai le risposte corrette e il tuo punteggio.')) submit();
                  }}
                >
                  Next page
                </button>
              )}
            </div>
          )}
          {finished && (
            <div className="submit-row">
              <button type="button" className="btn btn-secondary" onClick={onDiscard}>
                Inizia nuovo tentativo
              </button>
            </div>
          )}
        </main>

        <aside className="quiz-nav-side">
          <div className="card-block">
            <div className="nav-header-row">
              <h3>Quiz navigation</h3>
              <button className="nav-close-btn" aria-label="Close navigation">×</button>
            </div>
            <div className="qn_buttons clearfix allquestionsononepage">
              {isChemistry && (
                <>
                  <a
                    href="#info-3"
                    className={`qnbutton info ${!finished && currentIdx === -3 ? 'thispage' : ''} btn`}
                    title="Information"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!finished) setCurrentIdx(-3);
                    }}
                  >
                    i
                  </a>
                  <a
                    href="#info-2"
                    className={`qnbutton info ${!finished && currentIdx === -2 ? 'thispage' : ''} btn`}
                    title="Information"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!finished) setCurrentIdx(-2);
                    }}
                  >
                    i
                  </a>
                  <a
                    href="#info-1"
                    className={`qnbutton info ${!finished && currentIdx === -1 ? 'thispage' : ''} btn`}
                    title="Information"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!finished) setCurrentIdx(-1);
                    }}
                  >
                    i
                  </a>
                </>
              )}
              {attempt.questions.map((q, idx) => {
                const ans = attempt.answers[q.id];
                const isCorrect = finished && q.correct_answer && ans === q.correct_answer;
                const isWrong = finished && q.correct_answer && ans && ans !== q.correct_answer;
                const isBlank = finished && q.correct_answer && !ans;
                const state = isCorrect
                  ? 'correct'
                  : isWrong
                    ? 'incorrect'
                    : isBlank
                      ? 'notyetanswered'
                      : ans
                        ? 'answersaved'
                        : 'notyetanswered';
                const isCurrent = !finished && idx === currentIdx;
                return (
                  <a
                    key={`${idx}-${q.id}`}
                    href={`#question-${idx}`}
                    className={`qnbutton ${state} ${attempt.flagged[q.id] ? 'flagged' : ''} ${isCurrent ? 'thispage' : ''} btn`}
                    title={`Domanda ${idx + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!finished) {
                        setCurrentIdx(idx);
                      } else {
                        document
                          .getElementById(`question-${idx}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    <span className="thispageholder" />
                    <span className="trafficlight" />
                    {idx + 1}
                  </a>
                );
              })}
            </div>
            {!finished && (
              <button
                type="button"
                className="btn-finish-attempt"
                onClick={() => {
                  if (confirm('Terminare il tentativo ora?')) submit();
                }}
              >
                Finish attempt ...
              </button>
            )}
            {finished && score && (
              <div className="score-summary">
                <div className="row"><span>Corrette</span><b className="text-correct">{score.correct}</b></div>
                <div className="row"><span>Errate</span><b className="text-wrong">{score.wrong}</b></div>
                <div className="row"><span>In bianco</span><b>{score.blank}</b></div>
                <div className="row total"><span>Punteggio</span><b>{formatIt(score.marks)} / {formatIt(score.maxMarks)}</b></div>
              </div>
            )}
          </div>
        </aside>
      </div>
      
      {/* Floating help button matching Moodle */}
      <button className="moodle-help-float-btn" aria-label="Help">?</button>
    </div>
  );
}

function QuestionBlock({
  q, index, selected, flagged, finished, scoring, onSelect, onFlag,
}: {
  q: Question;
  index: number;
  selected?: string;
  flagged: boolean;
  finished: boolean;
  scoring: ScoringRules;
  onSelect: (label: string) => void;
  onFlag: () => void;
}) {
  const isCorrect = finished && q.correct_answer && selected === q.correct_answer;
  const isWrong = finished && q.correct_answer && selected && selected !== q.correct_answer;
  const isBlank = finished && q.correct_answer && !selected;
  const stateClass = isCorrect ? 'correct' : isWrong ? 'incorrect' : isBlank ? 'notanswered' : '';
  const stateText = isCorrect ? 'Correct' : isWrong ? 'Incorrect' : isBlank ? 'Not answered' : '';
  const earned = isCorrect ? scoring.correct : isWrong ? scoring.wrong : 0;

  return (
    <div id={`question-${index}`} className={`que multichoice deferredfeedback ${stateClass}`}>
      <div className="info">
        <h3 className="no">Question <span className="qno">{index + 1}</span></h3>
        <div className="state-text">
          {finished ? stateText : (selected ? 'Answer saved' : 'Not yet answered')}
        </div>
        {finished && q.correct_answer ? (
          <div className="grade">Marked out of {formatIt(scoring.correct)}</div>
        ) : (
          <div className="grade">Marked out of {formatIt(scoring.correct)}</div>
        )}
        <div className="questionflag editable">
          <a
            role="button"
            tabIndex={0}
            className="aabtn"
            aria-pressed={flagged}
            onClick={(e) => { e.preventDefault(); if (!finished) onFlag(); }}
          >
            <svg className={`questionflagimage-svg ${flagged ? 'flagged' : ''}`} viewBox="0 0 24 24" width="14" height="14">
              <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
            </svg>
            {flagged ? 'Remove flag' : 'Flag question'}
          </a>
        </div>
      </div>
      <div className="content">
        <div className="formulation clearfix">
          <h4 className="accesshide">Question text</h4>
          <div className="qtext">
            <MathText text={q.question_text} />
          </div>
          {q.question_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.question_image} alt="" className="img-responsive" style={{ maxWidth: '100%', marginTop: 12 }} />
          )}
          <fieldset className="ablock no-overflow visual-scroll-x">
            <legend className="prompt h6 font-weight-normal">
              <span className="sr-only">Question {index + 1}</span> Select one:
            </legend>
            <div className="answer">
              {q.options?.map((opt, i) => {
                const isThisSelected = selected === opt.label;
                const isThisCorrect = finished && q.correct_answer === opt.label;
                const isThisWrong = finished && isThisSelected && !isThisCorrect;
                const cls = [
                  i % 2 === 0 ? 'r0' : 'r1',
                  isThisCorrect ? 'correct' : '',
                  isThisWrong ? 'incorrect' : '',
                ].filter(Boolean).join(' ');
                return (
                  <div key={opt.label} className={cls}>
                    <input
                      type="radio"
                      name={`q_${index}_${q.id}`}
                      id={`q_${index}_${q.id}_${opt.label}`}
                      value={opt.label}
                      checked={isThisSelected}
                      disabled={finished}
                      onChange={() => onSelect(opt.label)}
                    />
                    <label htmlFor={`q_${index}_${q.id}_${opt.label}`} className="d-flex w-auto">
                      <span className="option-label-bullet">{opt.label}.</span>
                      <div className="flex-fill ms-1"><MathText text={opt.text} /></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>
        {finished && q.correct_answer && (
          <div className="outcome clearfix">
            <h4 className="accesshide">Feedback</h4>
            <div className="feedback">
              <div className="rightanswer">
                The correct answer is:{' '}
                <MathText text={q.options?.find((o) => o.label === q.correct_answer)?.text ?? q.correct_answer} />
              </div>
              {q.solution && (
                <div className="generalfeedback" style={{ marginTop: 8 }}>
                  <MathText text={q.solution} />
                </div>
              )}
            </div>
          </div>
        )}
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
function formatIt(n: number): string { return n.toFixed(2).replace('.', ','); }
function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec} sec.`;
  const m = Math.floor(totalSec / 60);
  return `${m} min.`;
}
const IT_DAYS = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const IT_MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function formatItDate(d: Date): string {
  return `${IT_DAYS[d.getDay()]}, ${d.getDate()} ${IT_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
