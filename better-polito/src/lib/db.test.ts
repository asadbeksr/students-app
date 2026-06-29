import { describe, expect, it } from 'vitest';
import { db } from '@/lib/db';

describe('StudyBuddyDB schema', () => {
  it('opens at the current version with the exam-practice stores', async () => {
    await db.open();
    expect(db.verno).toBe(11);
    const tables = db.tables.map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(['examAttempts', 'examHistory', 'examConfigs']));
  });

  it('no longer carries the legacy mock-exam stores', async () => {
    await db.open();
    const tables = db.tables.map((t) => t.name);
    expect(tables).not.toContain('mockExams');
    // examAttempts now exists but as the new active-attempt store, keyed by id.
    const examAttempts = db.tables.find((t) => t.name === 'examAttempts');
    expect(examAttempts?.schema.primKey.name).toBe('id');
  });

  it('exposes the [subject+mode] index on examHistory', async () => {
    await db.open();
    const examHistory = db.tables.find((t) => t.name === 'examHistory');
    const indexNames = examHistory?.schema.indexes.map((i) => i.name) ?? [];
    expect(indexNames).toContain('[subject+mode]');
  });
});
