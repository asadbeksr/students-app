'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import type { GradedResult, RunnerQuestion, ScoringRules, SubjectConfig } from '@/types/exam';
import { type Attempt, attemptLabel, isFinished, remainingSeconds } from '@/lib/exam/attempt';
import { MathText } from './MathText';

const CHEMISTRY_INFOS = [
  { id: -3, title: 'Periodic Table of the Elements', src: '/moodle/periodic_table.png' },
  { id: -2, title: 'Standard enthalpy of formation (kJ/mol)', src: '/moodle/enthalpy.png' },
  { id: -1, title: 'Standard electrode potential Eº(volt)', src: '/moodle/electrode_potential.png' },
];

interface Props {
  subject: SubjectConfig;
  attempt: Attempt;
  onUpdate: (updater: (a: Attempt) => Attempt) => void;
  onDiscard: () => void;
  onRetrySelected?: (questionIds: string[]) => void;
}

export function McqRunner({ subject, attempt, onUpdate, onDiscard, onRetrySelected }: Props) {
  const [retrySelection, setRetrySelection] = useState<Set<string>>(new Set());
  const examLabel = attemptLabel(attempt.config);
  const fullTitle = examLabel ? `${subject.name} — ${examLabel}` : `${subject.name} Mock Exam`;
  const finished = isFinished(attempt);
  const isChemistry = subject.slug.toLowerCase() === 'chemistry';
  const infoCount = isChemistry ? 3 : 0;
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(attempt));
  const [currentIdx, setCurrentIdx] = useState(() => isChemistry ? -3 : 0);
  const [isTimerHidden, setIsTimerHidden] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
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
    onUpdate((a) => {
      if (!label) {
        const nextAnswers = { ...a.answers };
        delete nextAnswers[qId];
        return { ...a, answers: nextAnswers };
      }
      return { ...a, answers: { ...a.answers, [qId]: label } };
    });
  }
  function toggleFlag(qId: string) {
    onUpdate((a) => ({ ...a, flagged: { ...a.flagged, [qId]: !a.flagged[qId] } }));
  }

  const score = useMemo(() => (finished ? attempt.gradeScore ?? null : null), [finished, attempt]);
  const graded = attempt.graded;

  const modeLabel = 'Multiple choice';
  const startedAt = new Date(attempt.startedAt);
  const finishedAt = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
  const elapsedSec = finishedAt
    ? Math.floor((finishedAt.getTime() - attempt.startedAt) / 1000)
    : (attempt.durationMin === 0 ? Math.floor((Date.now() - attempt.startedAt) / 1000) : attempt.durationMin * 60 - secondsLeft);

  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />

      <div className="quiz-header-toggle-container">
        <div className="quiz-breadcrumb">
          <Link href="/mock">2026_06KWRXQ_3</Link> <span>/</span>{' '}
          <Link href={`/mock/${subject.slug}`}>General</Link> <span>/</span>{' '}
          <span>{fullTitle}</span>
        </div>
      </div>

      <div className="quiz-title-row">
        <h1 className="quiz-title">
          <ListChecks size={32} strokeWidth={2} style={{ color: '#f7941d' }} />
          <span>{fullTitle}</span>
        </h1>
        {!finished && secondsLeft !== Infinity && (
          <div className={`moodle-timer-box title-timer ${secondsLeft < 60 ? 'timer-danger' : ''}`} style={{ visibility: isTimerHidden ? 'hidden' : 'visible' }}>
            Time remaining: <strong>{formatTime(secondsLeft)}</strong>
          </div>
        )}
        <button
          className={`drawer-toggle-btn ${isDrawerOpen ? 'is-open' : 'is-closed'}`}
          aria-label={isDrawerOpen ? 'Close block drawer' : 'Open block drawer'}
          title={isDrawerOpen ? 'Close block drawer' : 'Open block drawer'}
          onClick={() => setIsDrawerOpen((v) => !v)}
        >
          {isDrawerOpen ? (
            <span className="drawer-toggle-x">×</span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drawer-open-svg">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          )}
        </button>
      </div>

      {finished && score && (
        <table className="generaltable generalbox quizreviewsummary mb-4">
          <caption className="sr-only">Attempt summary</caption>
          <tbody>
            <tr><th className="cell" scope="row">Status</th><td className="cell">Completed</td></tr>
            <tr><th className="cell" scope="row">Started</th><td className="cell">{formatDate(startedAt)}</td></tr>
            <tr><th className="cell" scope="row">Finished</th><td className="cell">{formatDate(finishedAt ?? new Date())}</td></tr>
            <tr><th className="cell" scope="row">Time taken</th><td className="cell">{formatDuration(elapsedSec)}</td></tr>
            <tr>
              <th className="cell" scope="row">Grade</th>
              <td className="cell">
                <b>{formatGrade(score.marks)}</b> out of {formatGrade(score.maxMarks)} (<b>{Math.round(score.pct)}</b>%)
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <div className={`quiz-layout ${isDrawerOpen ? '' : 'drawer-closed'}`}>
        <main className="quiz-main">
          {attempt.questions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2>No questions found</h2>
              <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', color: '#6c757d' }}>This exam attempt was generated with 0 questions. Please adjust your filters and try again.</p>
              <button type="button" className="btn btn-secondary" onClick={onDiscard}>Go back</button>
            </div>
          ) : finished ? (
            <>
              {isChemistry && CHEMISTRY_INFOS.map(info => (
                <div key={info.id} className="que info-block" style={{ marginBottom: '1.8em' }}>
                  <div className="info">
                    <h3 className="no">Information</h3>
                    <div className="state-text">Info question</div>
                  </div>
                  <div className="content">
                    <div className="formulation clearfix">
                      <div className="qtext" style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                        {info.title}
                      </div>
                      <img
                        src={info.src}
                        alt={info.title}
                        style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid #dee2e6' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {attempt.questions.map((q, idx) => {
                const isSelected = retrySelection.has(q.id);
                return (
                  <div key={`${idx}-${q.id}`} className={`review-question-wrap ${isSelected ? 'is-selected' : ''}`}>
                    {onRetrySelected && (
                      <label className="review-pick" title="Select for retry">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setRetrySelection((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(q.id);
                              else next.delete(q.id);
                              return next;
                            });
                          }}
                        />
                        <span>Retry</span>
                      </label>
                    )}
                    <QuestionBlock
                      q={q}
                      index={idx}
                      selected={attempt.answers[q.id]}
                      flagged={!!attempt.flagged[q.id]}
                      finished={finished}
                      scoring={attempt.scoring}
                      grade={graded?.[q.id]}
                      onSelect={(label) => selectAnswer(q.id, label)}
                      onFlag={() => toggleFlag(q.id)}
                    />
                  </div>
                );
              })}
            </>
          ) : currentIdx < 0 ? (
            (() => {
              const info = CHEMISTRY_INFOS.find(i => i.id === currentIdx);
              if (!info) return null;
              return (
                <div className="que info-block">
                  <div className="info">
                    <h3 className="no">Information</h3>
                    <div className="state-text">Info question</div>
                  </div>
                  <div className="content">
                    <div className="formulation clearfix">
                      <div className="qtext" style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                        {info.title}
                      </div>
                      <img
                        src={info.src}
                        alt={info.title}
                        style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid #dee2e6' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()
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
                  grade={graded?.[q.id]}
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
                    if (confirm('Finish attempt? You will see the correct answers and your score.')) submit();
                  }}
                >
                  Next page
                </button>
              )}
            </div>
          )}
          {finished && (
            <div className="submit-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={onDiscard}>
                Start new attempt
              </button>
              {onRetrySelected && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const wrong = attempt.questions
                        .filter((q) => graded?.[q.id]?.status === 'wrong')
                        .map((q) => q.id);
                      setRetrySelection(new Set(wrong));
                    }}
                  >
                    Select wrong
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const blank = attempt.questions
                        .filter((q) => !attempt.answers[q.id])
                        .map((q) => q.id);
                      setRetrySelection(new Set(blank));
                    }}
                  >
                    Select unanswered
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRetrySelection(new Set())}
                    disabled={retrySelection.size === 0}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
        </main>

        {finished && onRetrySelected && retrySelection.size > 0 && (
          <div className="retry-bar">
            <span className="retry-bar-count">
              <strong>{retrySelection.size}</strong> question{retrySelection.size === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const ids = Array.from(retrySelection);
                if (confirm(`Start a new attempt with ${ids.length} selected question${ids.length === 1 ? '' : 's'}?`)) {
                  onRetrySelected(ids);
                }
              }}
            >
              Retry selected
            </button>
          </div>
        )}

        <aside className="quiz-nav-side" aria-hidden={!isDrawerOpen}>
          <div className="card-block">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 16px' }}>Quiz navigation</h3>
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
                const g = graded?.[q.id];
                const isCorrect = finished && g?.status === 'correct';
                const isWrong = finished && g?.status === 'wrong';
                const isBlank = finished && g?.status === 'blank';
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
                    title={`Question ${idx + 1}`}
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
                  if (confirm('Finish attempt now?')) submit();
                }}
              >
                Finish attempt ...
              </button>
            )}
            {finished && score && (
              <div className="score-summary">
                <div className="row"><span>Correct</span><b className="text-correct">{score.correct}</b></div>
                <div className="row"><span>Incorrect</span><b className="text-wrong">{score.wrong}</b></div>
                <div className="row"><span>Blank</span><b>{score.blank}</b></div>
                <div className="row total"><span>Score</span><b>{formatGrade(score.marks)} / {formatGrade(score.maxMarks)}</b></div>
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
  q, index, selected, flagged, finished, scoring, grade, onSelect, onFlag,
}: {
  q: RunnerQuestion;
  index: number;
  selected?: string;
  flagged: boolean;
  finished: boolean;
  scoring: ScoringRules;
  grade?: GradedResult;
  onSelect: (label: string) => void;
  onFlag: () => void;
}) {
  const [showOriginalImg, setShowOriginalImg] = useState(false);
  const correctAnswer = grade?.correct_answer ?? null;
  const solution = grade?.solution ?? null;
  const isCorrect = finished && grade?.status === 'correct';
  const isWrong = finished && grade?.status === 'wrong';
  const isBlank = finished && grade?.status === 'blank';
  const stateClass = isCorrect ? 'correct' : isWrong ? 'incorrect' : isBlank ? 'notanswered' : '';
  const stateText = isCorrect ? 'Correct' : isWrong ? 'Incorrect' : isBlank ? 'Not answered' : '';

  return (
    <div id={`question-${index}`} className={`que multichoice deferredfeedback ${stateClass}`}>
      <div className="info">
        <h3 className="no">Question <span className="qno">{index + 1}</span></h3>
        <div className="state-text">
          {finished ? stateText : (selected ? 'Answer saved' : 'Not yet answered')}
        </div>
        <div className="grade">Marked out of {formatGrade(scoring.correct)}</div>
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
        {q.original_question_image && (
          <div className="original-image-toggle" style={{ marginTop: '0.8em' }}>
            <a
              role="button"
              tabIndex={0}
              className="aabtn"
              onClick={(e) => { e.preventDefault(); setShowOriginalImg(!showOriginalImg); }}
              style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '4px', color: 'var(--primary, #0f6cbf)', fontSize: '0.8125rem', cursor: 'pointer', lineHeight: 1.3 }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
                {showOriginalImg ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </>
                )}
              </svg>
              {showOriginalImg ? 'Hide Question Image' : 'Show Question Image'}
            </a>
          </div>
        )}
      </div>
      <div className="content">
        <div className="formulation clearfix">
          <h4 className="accesshide">Question text</h4>
          <div className="qtext">
            <MathText text={q.question_text} />
          </div>
          {q.original_question_image && showOriginalImg && (
            <div style={{ marginBottom: 16 }}>
              <img src={q.original_question_image} alt="Original question" style={{ maxWidth: '100%', border: '1px solid var(--border, #dee2e6)', borderRadius: 4 }} />
            </div>
          )}
          {q.question_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.question_image} alt="" className="img-responsive" style={{ maxWidth: '100%', marginBottom: 16 }} />
          )}
          <fieldset className="ablock no-overflow visual-scroll-x">
            <legend className="prompt h6 font-weight-normal">
              <span className="sr-only">Question {index + 1}</span> Select one:
            </legend>
            <div className="answer">
              {q.options?.map((opt, i) => {
                const isThisSelected = selected === opt.label;
                const isThisCorrect = finished && correctAnswer === opt.label;
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
            {!finished && selected && (
              <div style={{ marginTop: '0.8em', marginBottom: '0.5em' }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelect('');
                  }}
                  style={{ fontSize: '0.875rem', color: '#0056b3', textDecoration: 'none' }}
                >
                  Clear my choice
                </a>
              </div>
            )}
          </fieldset>
        </div>
        {finished && correctAnswer && (
          <div className="outcome clearfix">
            <h4 className="accesshide">Feedback</h4>
            <div className="feedback">
              <div className="rightanswer">
                The correct answer is:{' '}
                <MathText text={q.options?.find((o) => o.label === correctAnswer)?.text ?? correctAnswer} />
              </div>
              {solution && (
                <div className="generalfeedback" style={{ marginTop: 8 }}>
                  <MathText text={solution} />
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
function formatGrade(n: number): string { return n.toFixed(2); }
function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec} sec.`;
  const m = Math.floor(totalSec / 60);
  return `${m} min.`;
}
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatDate(d: Date): string {
  return `${EN_DAYS[d.getDay()]}, ${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
