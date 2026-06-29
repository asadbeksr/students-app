import type { Part } from '@google/genai';

/**
 * Tiny in-memory TTL cache for fetched + base64-encoded native PDF payloads,
 * keyed by absolute URL. The scanned-document path attaches the raw PDF to
 * Gemini on every turn; without this, each turn re-downloads the (up to 15 MB)
 * file from PoliTO and re-encodes it. Caching the encoded Part eliminates that
 * repeated fetch/encode for multi-turn chats over the same document.
 *
 * Process-local by design (best-effort on a long-running server; harmless on
 * serverless cold starts). Capped by entry count + TTL so memory stays bounded.
 */
interface CachedPdf {
  part: Part;
  cachedAt: number;
}

const cache = new Map<string, CachedPdf>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 3;         // each entry can hold ~15 MB of base64

export function getCachedPdfPart(url: string): Part | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(url);
    return null;
  }
  return entry.part;
}

export function setCachedPdfPart(url: string, part: Part): void {
  // Evict the oldest entry once at capacity (Map preserves insertion order).
  if (cache.size >= MAX_ENTRIES && !cache.has(url)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(url, { part, cachedAt: Date.now() });
}

/** Test-only: reset the cache between specs. */
export function _clearPdfCache(): void {
  cache.clear();
}
