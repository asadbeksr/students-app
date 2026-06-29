import 'fake-indexeddb/auto';

// The persistence layer guards on `typeof window` and Dexie expects browser
// globals. In the Node test environment we expose `window` (pointing at the
// global object that fake-indexeddb/auto has populated with `indexedDB` /
// `IDBKeyRange`) so the real Dexie code path runs against an in-memory store.
const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.window === 'undefined') {
  g.window = globalThis;
}
