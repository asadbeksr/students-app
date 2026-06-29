import { describe, expect, it } from 'vitest';
import { parseStudyPlan } from './studyPlan';

describe('parseStudyPlan', () => {
  const valid = JSON.stringify({
    weeks: [{ label: 'Week 1', tasks: [{ subject: 'Math', description: 'Ch 1-3' }] }],
    summary: 'Focus on calculus.',
  });

  it('parses a clean JSON plan', () => {
    const plan = parseStudyPlan(valid);
    expect(plan?.weeks).toHaveLength(1);
    expect(plan?.summary).toBe('Focus on calculus.');
  });

  it('salvages a JSON block wrapped in prose/markdown fences', () => {
    const wrapped = '```json\n' + valid + '\n```';
    expect(parseStudyPlan(wrapped)?.weeks).toHaveLength(1);
  });

  it('returns null for a truncated / malformed response (graceful fallback path)', () => {
    expect(parseStudyPlan('{"weeks": [{"label": "Week 1", "tas')).toBeNull();
    expect(parseStudyPlan('')).toBeNull();
    expect(parseStudyPlan('not json at all')).toBeNull();
  });

  it('rejects JSON that lacks the weeks array', () => {
    expect(parseStudyPlan('{"summary": "hi"}')).toBeNull();
  });
});
