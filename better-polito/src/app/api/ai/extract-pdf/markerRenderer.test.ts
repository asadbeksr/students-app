import { describe, expect, it } from 'vitest';
import { renderPageWithMarker, type PdfPageProxyLike } from './markerRenderer';

function mockPage(pageNumber: number, items: { str: string; y: number }[]): PdfPageProxyLike {
  return {
    pageNumber,
    getTextContent: async () => ({
      items: items.map(i => ({ str: i.str, transform: [1, 0, 0, 1, 0, i.y] })),
    }),
  };
}

describe('renderPageWithMarker', () => {
  it('prefixes the page with a --- Page N --- marker', async () => {
    const out = await renderPageWithMarker(mockPage(3, [{ str: 'Hello', y: 700 }]));
    expect(out).toBe('--- Page 3 ---\nHello');
  });

  it('keeps same-Y items on one line and breaks on a new Y', async () => {
    const out = await renderPageWithMarker(
      mockPage(1, [
        { str: 'foo', y: 700 },
        { str: 'bar', y: 700 },
        { str: 'baz', y: 680 },
      ])
    );
    expect(out).toBe('--- Page 1 ---\nfoobar\nbaz');
  });

  it('emits the format the chat route page-map regex expects (incl. trimmed page 1)', async () => {
    // pdf-parse joins pages with "\n\n" then the route trims, dropping the
    // leading "\n\n" before page 1. Assert the route's tolerant page-map split
    // still recovers BOTH pages.
    const p1 = await renderPageWithMarker(mockPage(1, [{ str: 'one', y: 700 }]));
    const p2 = await renderPageWithMarker(mockPage(2, [{ str: 'two', y: 700 }]));
    const joined = `\n\n${p1}\n\n${p2}`.trim();

    const map: Record<number, string> = {};
    const parts = joined.split(/\n{0,2}--- Page (\d+) ---\n/);
    for (let i = 1; i < parts.length - 1; i += 2) {
      map[parseInt(parts[i], 10)] = parts[i + 1]?.trim() ?? '';
    }
    expect(map).toEqual({ 1: 'one', 2: 'two' });
  });
});
