import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Part } from '@google/genai';
import { _clearPdfCache, getCachedPdfPart, setCachedPdfPart } from '@/lib/nativePdfCache';

const part = (id: string): Part => ({ inlineData: { data: id, mimeType: 'application/pdf' } });

afterEach(() => {
  _clearPdfCache();
  vi.useRealTimers();
});

describe('nativePdfCache', () => {
  it('returns null on a miss and the stored part on a hit', () => {
    expect(getCachedPdfPart('u1')).toBeNull();
    setCachedPdfPart('u1', part('a'));
    expect(getCachedPdfPart('u1')).toEqual(part('a'));
  });

  it('expires entries after the TTL', () => {
    vi.useFakeTimers();
    setCachedPdfPart('u1', part('a'));
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(getCachedPdfPart('u1')).toEqual(part('a')); // still fresh
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(getCachedPdfPart('u1')).toBeNull(); // > 10 min
  });

  it('evicts the oldest entry past capacity (max 3)', () => {
    setCachedPdfPart('u1', part('1'));
    setCachedPdfPart('u2', part('2'));
    setCachedPdfPart('u3', part('3'));
    setCachedPdfPart('u4', part('4')); // evicts u1
    expect(getCachedPdfPart('u1')).toBeNull();
    expect(getCachedPdfPart('u4')).toEqual(part('4'));
    expect(getCachedPdfPart('u2')).toEqual(part('2'));
  });

  it('refreshing an existing key does not evict others', () => {
    setCachedPdfPart('u1', part('1'));
    setCachedPdfPart('u2', part('2'));
    setCachedPdfPart('u3', part('3'));
    setCachedPdfPart('u2', part('2b')); // update, not insert
    expect(getCachedPdfPart('u1')).toEqual(part('1'));
    expect(getCachedPdfPart('u2')).toEqual(part('2b'));
  });
});
