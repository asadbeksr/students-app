import { db } from '@/lib/db';
import {
  useDocumentContentStore,
  type DocumentContent,
  type PreviewFile,
} from '@/lib/stores/coursePortalStore';

/**
 * Structured open-document metadata sent to the course-chat route. Replaces the
 * old `openDocumentUrl` / `openDocumentText` / `openDocumentFullText` trio so the
 * route can build its prompt from explicit fields instead of regexing prose.
 */
export interface OpenDocumentPayload {
  name: string;
  url: string;
  pageCount: number;
  currentPage: number | null;
  isScanned: boolean;
  status: DocumentContent['status'];
  /** Full extracted text — present only when status === 'ready'. */
  fullText?: string;
}

// In-flight extractions keyed by file id, so a concurrent ChatWindow effect and
// a sendMessage call share one network round-trip instead of racing.
const inFlight = new Map<string, Promise<DocumentContent>>();

async function runExtraction(preview: PreviewFile): Promise<DocumentContent> {
  const store = useDocumentContentStore.getState();
  store.setStatus(preview.id, 'extracting');

  const failed: DocumentContent = { text: '', pageCount: 0, isScanned: false, status: 'failed' };

  try {
    if (!preview.url) {
      store.setContent(preview.id, failed);
      return failed;
    }

    const isPdf = preview.name.toLowerCase().endsWith('.pdf');
    let content: DocumentContent;

    if (isPdf) {
      const res = await fetch('/api/ai/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: preview.url }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Extraction API error: ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      content = {
        text: data.text || '',
        pageCount: data.pageCount ?? 0,
        isScanned: !!data.isLikelyScanned,
        status: 'ready',
      };
    } else {
      const response = await fetch(preview.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      content = { text: await response.text(), pageCount: 0, isScanned: false, status: 'ready' };
    }

    store.setContent(preview.id, content);
    // Persist so reloads / a closed chat panel don't force a re-extraction.
    try {
      await db.documentText.put({
        id: preview.id,
        text: content.text,
        pageCount: content.pageCount,
        isScanned: content.isScanned,
        extractedAt: new Date().toISOString(),
      });
    } catch (persistError) {
      console.error('Failed to persist document text:', persistError);
    }
    return content;
  } catch (error) {
    console.error('Failed to extract document text:', error);
    store.setContent(preview.id, failed);
    return failed;
  }
}

// Read-through the Dexie persistence layer before extracting. Returns the
// hydrated content (also warming the in-memory cache) or null on a miss.
async function loadPersistedDocument(fileId: string): Promise<DocumentContent | null> {
  try {
    const stored = await db.documentText.get(fileId);
    if (!stored) return null;
    const content: DocumentContent = {
      text: stored.text,
      pageCount: stored.pageCount,
      isScanned: stored.isScanned,
      status: 'ready',
    };
    useDocumentContentStore.getState().setContent(fileId, content);
    return content;
  } catch (error) {
    console.error('Failed to read persisted document text:', error);
    return null;
  }
}

/**
 * Guarantee the open document's text is extracted, triggering extraction if it
 * has not started yet. Returns the cached result when already `ready`/`failed`,
 * and de-duplicates concurrent callers via an in-flight map. This is the single
 * extraction entry point shared by the ChatWindow effect and the send flow, so
 * the AI is never sent a request blind to a document that is open on screen.
 */
export function ensureDocumentExtracted(
  preview: PreviewFile | null
): Promise<DocumentContent | null> {
  if (!preview) return Promise.resolve(null);

  const cached = useDocumentContentStore.getState().getContent(preview.id);
  if (cached && (cached.status === 'ready' || cached.status === 'failed')) {
    return Promise.resolve(cached);
  }

  const existing = inFlight.get(preview.id);
  if (existing) return existing;

  // Try the Dexie cache first, then fall back to a fresh extraction.
  const p = loadPersistedDocument(preview.id)
    .then(persisted => persisted ?? runExtraction(preview))
    .finally(() => inFlight.delete(preview.id));
  inFlight.set(preview.id, p);
  return p;
}

/**
 * Like {@link ensureDocumentExtracted} but bounded: if extraction does not
 * finish within `timeoutMs`, resolves with a `status: 'extracting'` placeholder
 * (extraction keeps running in the background and will populate the cache for
 * the next turn). Used by the send flow so a slow PDF never blocks a message
 * indefinitely — the route then tells the model the doc is still loading rather
 * than claiming it cannot read it.
 */
export function waitForDocument(
  preview: PreviewFile,
  timeoutMs: number
): Promise<DocumentContent> {
  const extracting: DocumentContent = { text: '', pageCount: 0, isScanned: false, status: 'extracting' };
  const timeout = new Promise<DocumentContent>(resolve =>
    setTimeout(() => resolve(extracting), timeoutMs)
  );
  return Promise.race([
    ensureDocumentExtracted(preview).then(c => c ?? extracting),
    timeout,
  ]);
}
