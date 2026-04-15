/**
 * In-memory store for temporary public share tokens.
 *
 * Tokens expire after TTL_MS (default 1 hour).
 * This store lives for the lifetime of the Next.js Node process.
 * For multi-instance deployments, replace with Redis or a DB.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour

interface ShareEntry {
  internalUrl: string;
  expiresAt: number;
}

class ShareTokenStore {
  private store = new Map<string, ShareEntry>();

  /** Create a new token for an internal URL. Returns the token string. */
  create(internalUrl: string): string {
    // Use crypto.randomUUID if available (Node 14.17+), else fallback
    const token =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);

    this.store.set(token, { internalUrl, expiresAt: Date.now() + TTL_MS });
    this.sweep();
    return token;
  }

  /** Retrieve an entry by token. Returns null if missing or expired. */
  get(token: string): ShareEntry | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(token);
      return null;
    }
    return entry;
  }

  /** Remove all expired entries (called lazily on each create). */
  private sweep() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (now > v.expiresAt) this.store.delete(k);
    }
  }
}

// Singleton — survives hot reloads in dev via global
const globalKey = '__polito_share_store__';
declare const global: typeof globalThis & { [globalKey]?: ShareTokenStore };

export const shareStore: ShareTokenStore =
  global[globalKey] ?? (global[globalKey] = new ShareTokenStore());
