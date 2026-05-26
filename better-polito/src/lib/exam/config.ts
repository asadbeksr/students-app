import type { AttemptConfig, CatalogEntry, Difficulty, ExamMode, ModeConfig } from '@/types/exam';

const STORAGE_PREFIX = 'mock-config:';

export function configStorageKey(subject: string, mode: ExamMode): string {
  return `${STORAGE_PREFIX}${subject}:${mode}`;
}

export function defaultConfig(modeCfg: ModeConfig): AttemptConfig {
  return {
    topics: [],
    sourceFiles: [],
    difficulties: [],
    language: 'en',
    count: modeCfg.questionCount,
    durationMin: modeCfg.durationMin,
    shuffleQuestions: modeCfg.shuffle ?? true,
    shuffleOptions: false,
    scoring: modeCfg.scoring ?? { correct: 1, wrong: 0, blank: 0 },
    passScore: modeCfg.passScore ?? 60,
  };
}

export function loadSavedConfig(subject: string, mode: ExamMode): Partial<AttemptConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(configStorageKey(subject, mode));
    return raw ? (JSON.parse(raw) as Partial<AttemptConfig>) : null;
  } catch {
    return null;
  }
}

export function saveConfig(subject: string, mode: ExamMode, config: AttemptConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(configStorageKey(subject, mode), JSON.stringify(config));
  } catch {
    /* ignore quota errors */
  }
}

export function mergeConfig(base: AttemptConfig, override: Partial<AttemptConfig> | null): AttemptConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    scoring: { ...base.scoring, ...(override.scoring ?? {}) },
    topics: Array.isArray(override.topics) ? override.topics : base.topics,
    sourceFiles: Array.isArray(override.sourceFiles) ? override.sourceFiles : base.sourceFiles,
    difficulties: Array.isArray(override.difficulties)
      ? (override.difficulties as Difficulty[])
      : base.difficulties,
  };
}

export function countMatching(
  catalog: CatalogEntry[],
  filters: Pick<AttemptConfig, 'topics' | 'sourceFiles' | 'difficulties' | 'language'>,
): number {
  const topicSet = filters.topics.length > 0 ? new Set(filters.topics) : null;
  const sourceSet = filters.sourceFiles.length > 0 ? new Set(filters.sourceFiles) : null;
  const diffSet = filters.difficulties.length > 0 ? new Set(filters.difficulties) : null;
  const lang = filters.language !== 'any' ? filters.language : null;

  let n = 0;
  for (const e of catalog) {
    if (diffSet && !diffSet.has(e.difficulty)) continue;
    if (lang && e.language !== lang) continue;
    if (sourceSet && !sourceSet.has(e.source_file)) continue;
    if (topicSet && !e.topics.some((t) => topicSet.has(t))) continue;
    n++;
  }
  return n;
}
