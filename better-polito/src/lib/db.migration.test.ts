// @vitest-environment jsdom
import type { Transaction } from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrateExamLocalStorageToDexie } from '@/lib/db';

function recordingTx() {
  const puts: Record<string, unknown[]> = {};
  const tx = {
    table: (name: string) => ({
      put: async (value: unknown) => {
        (puts[name] ??= []).push(value);
      },
    }),
  } as unknown as Transaction;
  return { tx, puts };
}

beforeEach(() => {
  localStorage.clear();
});

describe('migrateExamLocalStorageToDexie', () => {
  it('ports active attempts, archives and configs, then clears consumed keys', async () => {
    localStorage.setItem('mock-attempt:math:mcq', JSON.stringify({ subject: 'math', mode: 'mcq', startedAt: 1 }));
    localStorage.setItem(
      'mock-attempt-history-data:99',
      JSON.stringify({ subject: 'math', mode: 'mcq', startedAt: 99, submittedAt: 120 }),
    );
    localStorage.setItem('mock-config:math:mcq', JSON.stringify({ count: 5 }));
    localStorage.setItem('mock-history:math:mcq', JSON.stringify([{ id: '99' }]));
    localStorage.setItem('unrelated-key', 'keep-me');

    const { tx, puts } = recordingTx();
    const consumed = await migrateExamLocalStorageToDexie(tx);

    expect(puts.examAttempts).toEqual([
      { id: 'math:mcq', attempt: { subject: 'math', mode: 'mcq', startedAt: 1 } },
    ]);
    expect(puts.examHistory).toEqual([
      {
        id: '99',
        subject: 'math',
        mode: 'mcq',
        startedAt: 99,
        attempt: { subject: 'math', mode: 'mcq', startedAt: 99, submittedAt: 120 },
      },
    ]);
    expect(puts.examConfigs).toEqual([{ id: 'math:mcq', config: { count: 5 } }]);

    expect(consumed.sort()).toEqual(
      [
        'mock-attempt:math:mcq',
        'mock-attempt-history-data:99',
        'mock-config:math:mcq',
        'mock-history:math:mcq',
      ].sort(),
    );

    // Consumed keys are removed; unrelated data is left untouched.
    expect(localStorage.getItem('mock-attempt:math:mcq')).toBeNull();
    expect(localStorage.getItem('mock-history:math:mcq')).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
  });

  it('skips unsubmitted archives and tolerates malformed JSON', async () => {
    localStorage.setItem(
      'mock-attempt-history-data:5',
      JSON.stringify({ subject: 'm', mode: 'mcq', startedAt: 5, submittedAt: null }),
    );
    localStorage.setItem('mock-config:bad', '{ not valid json');

    const { tx, puts } = recordingTx();
    const consumed = await migrateExamLocalStorageToDexie(tx);

    // Unsubmitted attempt is not archived, but its (now-stale) key is cleared.
    expect(puts.examHistory).toBeUndefined();
    expect(consumed).toContain('mock-attempt-history-data:5');
    // Malformed entry throws before being consumed, so it is left in place.
    expect(localStorage.getItem('mock-config:bad')).toBe('{ not valid json');
  });

  it('is a no-op when there is nothing to migrate', async () => {
    const { tx, puts } = recordingTx();
    const consumed = await migrateExamLocalStorageToDexie(tx);
    expect(consumed).toEqual([]);
    expect(puts).toEqual({});
  });
});
