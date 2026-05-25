'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListChecks } from 'lucide-react';
import type {
  Difficulty,
  ExamMode,
  LanguageFilter,
  Question,
  QuestionFacets,
  SubjectConfig,
} from '@/types/exam';
import { saveAttempt, type Attempt } from '@/lib/exam/attempt';

interface Props {
  subject: SubjectConfig;
  questions: Question[];
  facets: QuestionFacets;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  any: 'Any',
  it: 'Italian',
  en: 'English',
};

export function QuestionBank({ subject, questions, facets }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<string[]>([]);
  const [diffFilter, setDiffFilter] = useState<Difficulty[]>([]);
  const [langFilter, setLangFilter] = useState<LanguageFilter>('any');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter questions
  const filtered = useMemo(() => {
    let out = questions;
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter(
        (q) =>
          q.id.toLowerCase().includes(s) ||
          q.question_text.toLowerCase().includes(s),
      );
    }
    if (topicFilter.length > 0) {
      const tf = new Set(topicFilter);
      out = out.filter((q) => q.topics?.some((t) => tf.has(t)));
    }
    if (diffFilter.length > 0) {
      const df = new Set(diffFilter);
      out = out.filter((q) => df.has(q.difficulty));
    }
    if (langFilter !== 'any') {
      out = out.filter((q) => q.language === langFilter);
    }
    return out;
  }, [questions, search, topicFilter, diffFilter, langFilter]);

  const uniqueFilteredIds = useMemo(() => new Set(filtered.map((q) => q.id)), [filtered]);

  function toggleSelectAll() {
    if (selected.size === uniqueFilteredIds.size && uniqueFilteredIds.size > 0) {
      setSelected(new Set());
    } else {
      setSelected(uniqueFilteredIds);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleTopic(t: string) {
    setTopicFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function toggleDiff(d: Difficulty) {
    setDiffFilter((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  async function handleStartAttempt() {
    if (selected.size === 0) return;
    setStarting(true);
    setError(null);
    try {
      const mode: ExamMode = 'mcq'; // Assuming mcq runner is used for practice attempts
      const modeCfg = subject.modes[mode];
      
      const config = {
        questionIds: Array.from(selected),
        count: selected.size,
        durationMin: Math.max(1, selected.size * 2), // Rough estimate: 2 mins per question
        shuffleQuestions: true,
        shuffleOptions: false,
        topics: [],
        difficulties: [],
        language: 'any',
        scoring: modeCfg?.scoring ?? { correct: 1, wrong: 0, blank: 0 },
        passScore: modeCfg?.passScore ?? 60,
      };

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
      router.push(`/mock/${subject.slug}/${mode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error starting attempt');
      setStarting(false);
    }
  }

  function handleExportPrint(mode: 'practice' | 'answer_key') {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    const url = `/mock/${subject.slug}/bank/print?ids=${encodeURIComponent(ids)}&mode=${mode}`;
    window.open(url, '_blank');
  }

  const hasSelected = selected.size > 0;

  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />
      <div className="quiz-breadcrumb">
        <Link href="/mock">Mock exams</Link> <span>/</span>{' '}
        <Link href={`/mock/${subject.slug}`}>{subject.name}</Link> <span>/</span>{' '}
        <span>Question Bank</span>
      </div>
      <h1 className="quiz-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ListChecks size={32} strokeWidth={2} style={{ color: '#f7941d' }} />
        <span>{subject.name} — Question Bank</span>
      </h1>

      {error && <div className="start-error">{error}</div>}

      <div className="quiz-layout" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="quiz-main">
          {hasSelected && (
            <div className="card-block" style={{ marginBottom: 20, background: '#f8f9fa', borderColor: '#f7941d' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong>{selected.size}</strong> questions selected
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStartAttempt}
                    disabled={starting}
                  >
                    {starting ? 'Starting...' : 'Start selection'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleExportPrint('practice')}
                  >
                    Print Practice
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleExportPrint('answer_key')}
                  >
                    Print Answer Key
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card-block" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
            <table className="generaltable generalbox quizreviewsummary mb-0" style={{ width: '100%', whiteSpace: 'nowrap' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <tr>
                  <th className="cell" style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === uniqueFilteredIds.size}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="cell">ID</th>
                  <th className="cell">Preview</th>
                  <th className="cell">Difficulty</th>
                  <th className="cell">Language</th>
                  <th className="cell">Topics</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, index) => {
                  const isChecked = selected.has(q.id);
                  return (
                    <tr key={`${q.id}-${index}`} style={{ background: isChecked ? '#e8f4fd' : 'transparent', cursor: 'pointer' }} onClick={() => toggleRow(q.id)}>
                      <td className="cell" style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRow(q.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="cell" style={{ fontSize: 13, fontFamily: 'monospace' }}>
                        {q.id.split('-')[0]}...
                      </td>
                      <td className="cell" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.question_text.replace(/<[^>]*>?/gm, '').slice(0, 80)}...
                        {q.has_formula && <span title="Formula" style={{ marginLeft: 4 }}>∑</span>}
                        {q.has_diagram && <span title="Image" style={{ marginLeft: 4 }}>🖼️</span>}
                      </td>
                      <td className="cell">
                        <span className={`chip ${q.difficulty === 'hard' ? 'chip-active' : ''}`} style={{ zoom: 0.8, pointerEvents: 'none' }}>
                          {DIFFICULTY_LABELS[q.difficulty]}
                        </span>
                      </td>
                      <td className="cell">{q.language.toUpperCase()}</td>
                      <td className="cell">
                        <div style={{ display: 'flex', gap: 4, overflow: 'hidden', maxWidth: 150 }}>
                          {q.topics?.slice(0, 2).map((t) => (
                            <span key={t} className="chip" style={{ zoom: 0.7, pointerEvents: 'none' }}>{t}</span>
                          ))}
                          {q.topics && q.topics.length > 2 && (
                            <span className="chip" style={{ zoom: 0.7 }}>+{q.topics.length - 2}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="cell" colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#6c757d' }}>
                      No questions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="quiz-nav-side">
          <div className="card-block config-card">
            <h3 style={{ marginBottom: 16 }}>Filter Questions</h3>
            
            <div className="config-section">
              <input
                type="text"
                placeholder="Search text or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 14 }}
              />
            </div>

            <div className="config-section">
              <div className="config-section-head">
                <h3>Topics</h3>
                <button type="button" className="link-btn" onClick={() => setTopicFilter([])}>
                  All
                </button>
              </div>
              <div className="chip-group" style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                {facets.topics.map((t) => (
                  <button
                    type="button"
                    key={t.topic}
                    className={`chip ${topicFilter.includes(t.topic) ? 'chip-active' : ''}`}
                    onClick={() => toggleTopic(t.topic)}
                  >
                    <span className="chip-label">{t.topic}</span>
                    <span className="chip-count">{t.total}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-head">
                <h3>Difficulty</h3>
              </div>
              <div className="chip-group">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`chip ${diffFilter.includes(d) ? 'chip-active' : ''}`}
                    onClick={() => toggleDiff(d)}
                  >
                    <span className="chip-label">{DIFFICULTY_LABELS[d]}</span>
                    <span className="chip-count">{facets.difficulties[d]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-head">
                <h3>Language</h3>
              </div>
              <div className="chip-group">
                {(['any', 'it', 'en'] as LanguageFilter[]).map((l) => (
                  <button
                    type="button"
                    key={l}
                    className={`chip ${langFilter === l ? 'chip-active' : ''}`}
                    onClick={() => setLangFilter(l)}
                  >
                    {LANGUAGE_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="config-hint" style={{ marginTop: 24, textAlign: 'center' }}>
              Showing: <b>{filtered.length}</b> out of {questions.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
