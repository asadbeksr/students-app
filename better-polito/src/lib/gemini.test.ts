import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GEMINI_MODEL, resolveModel, withGeminiRetry } from '@/lib/gemini';

describe('resolveModel', () => {
  it('falls back to the default for empty / nullish input', () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel(null)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel('')).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel('   ')).toBe(DEFAULT_GEMINI_MODEL);
  });

  it('honours an explicit model id', () => {
    expect(resolveModel('gemini-2.0-pro')).toBe('gemini-2.0-pro');
  });
});

describe('withGeminiRetry', () => {
  const fast = { baseDelayMs: 0 };

  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withGeminiRetry(fn, fast)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 and then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate limit hit'), { status: 429 }))
      .mockResolvedValue('recovered');
    await expect(withGeminiRetry(fn, fast)).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries transient 503 / overloaded errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('The model is overloaded. Please try again later.'))
      .mockResolvedValue('ok');
    await expect(withGeminiRetry(fn, fast)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retriable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('400 invalid request'));
    await expect(withGeminiRetry(fn, fast)).rejects.toThrow('invalid request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after the configured number of attempts', async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error('quota exceeded'), { status: 429 }));
    await expect(withGeminiRetry(fn, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow('quota');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
