'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListChecks } from 'lucide-react';
import Link from 'next/link';
import type {
  AttemptConfig,
  Difficulty,
  ExamMode,
  FacetsResponse,
  LanguageFilter,
  ModeConfig,
  SubjectConfig,
} from '@/types/exam';
import {
  countMatching,
  defaultConfig,
  loadSavedConfig,
  mergeConfig,
  saveConfig,
} from '@/lib/exam/config';

interface Props {
  subject: SubjectConfig;
  mode: ExamMode;
  modeCfg: ModeConfig;
  onStart: (config: AttemptConfig) => Promise<void> | void;
  starting: boolean;
  error: string | null;
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

export function ConfigScreen({ subject, mode, modeCfg, onStart, starting, error }: Props) {
  const modeLabel = mode === 'mcq' ? 'Multiple choice' : 'Written';
  const initialConfig = useMemo(() => defaultConfig(modeCfg), [modeCfg]);
  const [config, setConfig] = useState<AttemptConfig>(initialConfig);
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  useEffect(() => {
    const saved = loadSavedConfig(subject.slug, mode);
    setConfig(mergeConfig(initialConfig, saved));
  }, [subject.slug, mode, initialConfig]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch(`/api/exam/facets?subject=${encodeURIComponent(subject.slug)}&mode=${encodeURIComponent(mode)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as FacetsResponse;
      })
      .then((data) => {
        if (!cancelled) setFacets(data);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Error loading');
      });
    return () => {
      cancelled = true;
    };
  }, [subject.slug, mode]);

  const available = facets ? countMatching(facets.catalog, config) : null;
  const effectiveCount = available != null ? Math.min(config.count, available) : config.count;
  const canStart = !starting && (available == null || available > 0);

  function update<K extends keyof AttemptConfig>(key: K, value: AttemptConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function toggleTopic(topic: string) {
    setConfig((c) => {
      const has = c.topics.includes(topic);
      return { ...c, topics: has ? c.topics.filter((t) => t !== topic) : [...c.topics, topic] };
    });
  }

  function toggleDifficulty(d: Difficulty) {
    setConfig((c) => {
      const has = c.difficulties.includes(d);
      return { ...c, difficulties: has ? c.difficulties.filter((x) => x !== d) : [...c.difficulties, d] };
    });
  }

  function resetTopics() {
    update('topics', []);
  }
  function selectAllTopics() {
    if (facets) update('topics', facets.topics.map((t) => t.topic));
  }

  function handleStart() {
    const finalConfig = { ...config, count: effectiveCount };
    saveConfig(subject.slug, mode, finalConfig);
    void onStart(finalConfig);
  }

  const visibleTopics = facets
    ? showAllTopics
      ? facets.topics
      : facets.topics.slice(0, 12)
    : [];
  const hiddenTopicCount = facets ? facets.topics.length - visibleTopics.length : 0;

  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />
      <div className="quiz-breadcrumb">
        <Link href="/mock">Mock exams</Link> <span>/</span>{' '}
        <Link href={`/mock/${subject.slug}`}>{subject.name}</Link> <span>/</span>{' '}
        <span>{modeLabel}</span>
      </div>
      <h1 className="quiz-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ListChecks size={32} strokeWidth={2} style={{ color: '#f7941d' }} />
        <span>{subject.name} — {modeLabel} mock exam</span>
      </h1>

      <div className="start-card config-card">
        <h2>Configure attempt</h2>

        <div className="config-section">
          <h3>Difficulty</h3>
          <div className="chip-group">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
              const active = config.difficulties.includes(d);
              const count = facets?.difficulties[d] ?? 0;
              return (
                <button
                  type="button"
                  key={d}
                  className={`chip ${active ? 'chip-active' : ''}`}
                  onClick={() => toggleDifficulty(d)}
                >
                  <span className="chip-label">{DIFFICULTY_LABELS[d]}</span>
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="config-hint">
            {config.difficulties.length === 0
              ? 'No filter: includes all difficulties.'
              : `${config.difficulties.length} levels selected`}
          </div>
        </div>

        <div className="config-section">
          <h3>Language</h3>
          <div className="chip-group">
            {(['any', 'it', 'en'] as LanguageFilter[]).map((l) => (
              <button
                type="button"
                key={l}
                className={`chip ${config.language === l ? 'chip-active' : ''}`}
                onClick={() => update('language', l)}
              >
                {LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="config-grid">
          <label className="config-field">
            <span>Number of questions</span>
            <input
              type="number"
              min={1}
              max={available ?? 999}
              value={config.count}
              onChange={(e) => update('count', Math.max(1, Number(e.target.value) || 1))}
            />
            {available != null && (
              <small>
                Available: <b>{available}</b>
                {config.count > available && ' — will be capped'}
              </small>
            )}
          </label>

          <label className="config-field">
            <span>Time (min.)</span>
            <input
              type="number"
              min={1}
              value={config.durationMin}
              onChange={(e) => update('durationMin', Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
        </div>

        <details className="advanced-settings" style={{ marginTop: '24px', padding: '16px', border: '1px solid #dee2e6', borderRadius: '8px', background: '#f8f9fa' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em', userSelect: 'none' }}>
            Advanced settings
          </summary>
          
          <div style={{ marginTop: '24px' }}>
            <div className="config-section">
              <div className="config-section-head">
                <h3>Topics</h3>
                <div className="config-section-actions">
                  <button type="button" className="link-btn" onClick={resetTopics}>
                    All
                  </button>
                  <button type="button" className="link-btn" onClick={selectAllTopics} disabled={!facets}>
                    Select all
                  </button>
                </div>
              </div>
              {!facets && !loadError && <div className="config-hint">Loading topics…</div>}
              {loadError && <div className="start-error">{loadError}</div>}
              {facets && facets.topics.length === 0 && (
                <div className="config-hint">No tagged topics.</div>
              )}
              {facets && facets.topics.length > 0 && (
                <>
                  <div className="chip-group">
                    {visibleTopics.map((t) => {
                      const active = config.topics.includes(t.topic);
                      return (
                        <button
                          type="button"
                          key={t.topic}
                          className={`chip ${active ? 'chip-active' : ''}`}
                          onClick={() => toggleTopic(t.topic)}
                        >
                          <span className="chip-label">{t.topic}</span>
                          <span className="chip-count">{t.total}</span>
                        </button>
                      );
                    })}
                  </div>
                  {hiddenTopicCount > 0 && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setShowAllTopics(true)}
                    >
                      Show more {hiddenTopicCount}
                    </button>
                  )}
                  {showAllTopics && facets.topics.length > 12 && (
                    <button type="button" className="link-btn" onClick={() => setShowAllTopics(false)}>
                      Show less
                    </button>
                  )}
                  <div className="config-hint">
                    {config.topics.length === 0
                      ? 'No filter: includes all topics.'
                      : `${config.topics.length} topics selected`}
                  </div>
                </>
              )}
            </div>

            <div className="config-grid">
              <label className="config-field">
                <span>Passing score (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.passScore}
                  onChange={(e) => update('passScore', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                />
              </label>
            </div>

            <div className="config-section">
              <h3>Scoring</h3>
              <div className="config-grid">
                <label className="config-field">
                  <span>Correct</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.scoring.correct}
                    onChange={(e) =>
                      update('scoring', { ...config.scoring, correct: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="config-field">
                  <span>Wrong</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.scoring.wrong}
                    onChange={(e) =>
                      update('scoring', { ...config.scoring, wrong: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="config-field">
                  <span>Blank</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.scoring.blank}
                    onChange={(e) =>
                      update('scoring', { ...config.scoring, blank: Number(e.target.value) || 0 })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="config-section">
              <h3>Options</h3>
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={config.shuffleQuestions}
                  onChange={(e) => update('shuffleQuestions', e.target.checked)}
                />
                <span>Shuffle questions</span>
              </label>
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={config.shuffleOptions}
                  onChange={(e) => update('shuffleOptions', e.target.checked)}
                />
                <span>Shuffle answer options</span>
              </label>
            </div>
          </div>
        </details>

        <div className="start-note">
          Once the attempt is started, the timer runs and you cannot generate a new set of
          questions until the time expires or you finish the attempt.
        </div>

        {error && <div className="start-error">{error}</div>}

        <div className="config-actions">
          <button
            type="button"
            className="btn btn-primary start-btn"
            onClick={handleStart}
            disabled={!canStart}
          >
            {starting
              ? 'Starting…'
              : available != null
                ? `Attempt quiz (${effectiveCount} questions)`
                : 'Attempt quiz now'}
          </button>
          {available === 0 && (
            <div className="start-error" style={{ marginTop: 12 }}>
              No questions match the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
