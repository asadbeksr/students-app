import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// The persistence layer guards on `typeof window` and Dexie expects browser
// globals. In the Node test environment we expose `window` (pointing at the
// global object that fake-indexeddb/auto has populated with `indexedDB` /
// `IDBKeyRange`) so the real Dexie code path runs against an in-memory store.
const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.window === 'undefined') {
  g.window = globalThis;
}

// jsdom doesn't implement scrollIntoView; the exam runner calls it on review.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
