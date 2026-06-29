import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

/** Single source of truth for the default model id across all AI routes. */
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

/** Resolve a caller-supplied model id, falling back to the default. */
export function resolveModel(model?: string | null): string {
  return typeof model === 'string' && model.trim() ? model : DEFAULT_GEMINI_MODEL;
}

type GenerateContentParams = Parameters<GoogleGenAI['models']['generateContent']>[0];
type GenerateContentStreamParams = Parameters<GoogleGenAI['models']['generateContentStream']>[0];

/** Whether an error from the Gemini SDK is worth retrying (rate limit / transient). */
function isRetriableError(err: unknown): boolean {
  const e = err as { status?: number; code?: number; message?: string } | undefined;
  const status = e?.status ?? e?.code;
  if (status === 429 || status === 500 || status === 503) return true;
  const msg = (e?.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('try again')
  );
}

export interface GeminiRetryOptions {
  attempts?: number;     // total attempts including the first (default 3)
  baseDelayMs?: number;  // backoff base (default 500ms)
}

/**
 * Run a Gemini call with exponential backoff + jitter on 429 / transient
 * errors. Non-retriable errors (e.g. bad request, missing API key) throw
 * immediately. Shared by all AI routes so a momentary rate limit doesn't
 * surface to the student as a hard failure.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: GeminiRetryOptions = {}
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 500;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !isRetriableError(err)) throw err;
      const delay = base * 2 ** i + Math.random() * base;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Non-streaming Gemini call with the shared client + retry/backoff. */
export function callGemini(params: GenerateContentParams, opts?: GeminiRetryOptions) {
  const client = getGeminiClient();
  return withGeminiRetry(() => client.models.generateContent(params), opts);
}

/**
 * Streaming Gemini call with retry on the initial connection. Retry covers the
 * request that opens the stream; errors surfaced mid-iteration are handled by
 * the caller's stream loop.
 */
export function callGeminiStream(params: GenerateContentStreamParams, opts?: GeminiRetryOptions) {
  const client = getGeminiClient();
  return withGeminiRetry(() => client.models.generateContentStream(params), opts);
}
