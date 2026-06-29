import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import type { AttemptConfig, CatalogEntry, ModeConfig } from '@/types/exam';
import {
  countMatching,
  defaultConfig,
  loadSavedConfig,
  mergeConfig,
  saveConfig,
} from './config';

const modeCfg: ModeConfig = {
  questionCount: 10,
  durationMin: 45,
  passScore: 70,
  shuffle: false,
  scoring: { correct: 2, wrong: -1, blank: 0 },
};

beforeEach(async () => {
  await db.examConfigs.clear();
});

describe('defaultConfig', () => {
  it('derives a config from the mode config', () => {
    const cfg = defaultConfig(modeCfg);
    expect(cfg).toMatchObject({
      count: 10,
      durationMin: 45,
      passScore: 70,
      shuffleQuestions: false,
      scoring: { correct: 2, wrong: -1, blank: 0 },
      topics: [],
      sourceFiles: [],
      difficulties: [],
    });
  });

  it('falls back to sensible defaults when fields are absent', () => {
    const cfg = defaultConfig({ questionCount: 5, durationMin: 10 });
    expect(cfg.shuffleQuestions).toBe(true);
    expect(cfg.scoring).toEqual({ correct: 1, wrong: 0, blank: 0 });
    expect(cfg.passScore).toBe(60);
  });
});

describe('config persistence', () => {
  it('round-trips save → load', async () => {
    const cfg = defaultConfig(modeCfg);
    await saveConfig('math', 'mcq', { ...cfg, topics: ['Limits'] });
    expect(await loadSavedConfig('math', 'mcq')).toMatchObject({ topics: ['Limits'] });
  });

  it('returns null when nothing is saved', async () => {
    expect(await loadSavedConfig('math', 'written')).toBeNull();
  });

  it('keeps subject+mode pairs isolated', async () => {
    await saveConfig('math', 'mcq', { ...defaultConfig(modeCfg), count: 3 });
    await saveConfig('math', 'written', { ...defaultConfig(modeCfg), count: 7 });
    expect((await loadSavedConfig('math', 'mcq'))?.count).toBe(3);
    expect((await loadSavedConfig('math', 'written'))?.count).toBe(7);
  });
});

describe('mergeConfig', () => {
  it('returns the base when override is null', () => {
    const base = defaultConfig(modeCfg);
    expect(mergeConfig(base, null)).toBe(base);
  });

  it('merges scoring and array fields', () => {
    const base = defaultConfig(modeCfg);
    const merged = mergeConfig(base, {
      topics: ['A'],
      scoring: { wrong: -2 } as AttemptConfig['scoring'],
    });
    expect(merged.topics).toEqual(['A']);
    expect(merged.scoring).toEqual({ correct: 2, wrong: -2, blank: 0 });
    // non-array override should not clobber the base array
    expect(mergeConfig(base, { sourceFiles: undefined }).sourceFiles).toEqual(base.sourceFiles);
  });
});

describe('countMatching', () => {
  const catalog: CatalogEntry[] = [
    { id: '1', topics: ['limits'], source_file: 'a.pdf', difficulty: 'easy', language: 'en' },
    { id: '2', topics: ['series'], source_file: 'b.pdf', difficulty: 'hard', language: 'it' },
    { id: '3', topics: ['limits', 'series'], source_file: 'a.pdf', difficulty: 'medium', language: 'en' },
  ];

  it('counts everything with empty filters', () => {
    expect(countMatching(catalog, { topics: [], sourceFiles: [], difficulties: [], language: 'any' })).toBe(3);
  });

  it('filters by topic', () => {
    expect(countMatching(catalog, { topics: ['series'], sourceFiles: [], difficulties: [], language: 'any' })).toBe(2);
  });

  it('filters by source file and difficulty', () => {
    expect(countMatching(catalog, { topics: [], sourceFiles: ['a.pdf'], difficulties: ['medium'], language: 'any' })).toBe(1);
  });

  it('filters by language', () => {
    expect(countMatching(catalog, { topics: [], sourceFiles: [], difficulties: [], language: 'en' })).toBe(2);
  });
});
