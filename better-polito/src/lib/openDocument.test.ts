import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureDocumentExtracted, waitForDocument } from '@/lib/openDocument';
import { useDocumentContentStore } from '@/lib/stores/coursePortalStore';

function mockExtractResponse(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  useDocumentContentStore.setState({ cache: {} });
});

describe('ensureDocumentExtracted', () => {
  it('extracts a PDF and caches structured ready content', async () => {
    const fetchMock = mockExtractResponse({ text: '--- Page 1 ---\nhi', pageCount: 3, isLikelyScanned: false });
    vi.stubGlobal('fetch', fetchMock);

    const result = await ensureDocumentExtracted({ id: 'f1', name: 'lecture.pdf', url: '/api/polito/file/1' });

    expect(result).toEqual({ text: '--- Page 1 ---\nhi', pageCount: 3, isScanned: false, status: 'ready' });
    expect(useDocumentContentStore.getState().getContent('f1')?.status).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flags scanned PDFs via isScanned', async () => {
    vi.stubGlobal('fetch', mockExtractResponse({ text: '', pageCount: 10, isLikelyScanned: true }));
    const result = await ensureDocumentExtracted({ id: 'f2', name: 'scan.pdf', url: '/api/polito/file/2' });
    expect(result?.isScanned).toBe(true);
    expect(result?.status).toBe('ready');
  });

  it('returns failed status when extraction errors out', async () => {
    vi.stubGlobal('fetch', mockExtractResponse({ error: 'boom' }, false));
    const result = await ensureDocumentExtracted({ id: 'f3', name: 'broken.pdf', url: '/api/polito/file/3' });
    expect(result?.status).toBe('failed');
    expect(result?.text).toBe('');
  });

  it('de-duplicates concurrent extractions into one fetch', async () => {
    const fetchMock = mockExtractResponse({ text: 't', pageCount: 1, isLikelyScanned: false });
    vi.stubGlobal('fetch', fetchMock);

    const preview = { id: 'f4', name: 'a.pdf', url: '/api/polito/file/4' };
    const [a, b] = await Promise.all([ensureDocumentExtracted(preview), ensureDocumentExtracted(preview)]);

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves cached ready content without re-fetching', async () => {
    const fetchMock = mockExtractResponse({ text: 't', pageCount: 1, isLikelyScanned: false });
    vi.stubGlobal('fetch', fetchMock);

    const preview = { id: 'f5', name: 'a.pdf', url: '/api/polito/file/5' };
    await ensureDocumentExtracted(preview);
    await ensureDocumentExtracted(preview);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resolves to null for no open document', async () => {
    await expect(ensureDocumentExtracted(null)).resolves.toBeNull();
  });
});

describe('waitForDocument', () => {
  it('returns an extracting placeholder when extraction exceeds the timeout', async () => {
    // A fetch that never resolves within the timeout window.
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));

    const result = await waitForDocument({ id: 'slow', name: 's.pdf', url: '/api/polito/file/9' }, 10);
    expect(result.status).toBe('extracting');
  });
});
