export const runtime = 'nodejs';

import path from 'path';
import { pathToFileURL } from 'url';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

const POLITO_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH ?? 'https://app.didattica.polito.it';

function toTargetUrl(rawUrl: string): string | null {
  if (rawUrl.startsWith('/api/polito/')) {
    const apiPath = rawUrl.replace(/^\/api\/polito\/?/, '');
    return `${POLITO_BASE}/api/${apiPath}`;
  }
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<{ text: string; pageCount: number; isLikelyScanned: boolean }> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs')
  ).href;

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = doc.numPages;
  const maxPages = Math.min(pageCount, 50);
  let fullText = '';
  let totalChars = 0;

  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      if (!content?.items?.length) continue;

      const items = content.items
        .filter((item: any) => 'str' in item && item.str.trim() !== '')
        .map((item: any) => ({
          str: item.str,
          x: Array.isArray(item.transform) ? (item.transform[4] ?? 0) : 0,
          y: Array.isArray(item.transform) ? (item.transform[5] ?? 0) : 0,
          height: item.height || (Array.isArray(item.transform) ? Math.abs(item.transform[3]) : 0) || 10,
          hasEOL: item.hasEOL || false,
        }));

      items.sort((a: any, b: any) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > a.height * 0.5) return yDiff;
        return a.x - b.x;
      });

      let pageText = '';
      let lastY: number | null = null;
      for (const item of items as any[]) {
        if (lastY !== null && Math.abs(lastY - item.y) > item.height * 0.8) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
        lastY = item.y;
      }

      if (pageText.trim()) {
        totalChars += pageText.length;
        fullText += `\n\n--- Page ${i} ---\n${pageText.trim()}`;
      }
    } catch {
      // skip corrupted page
    }

    if (totalChars > 100000) {
      fullText += '\n\n[... Extraction stopped at 100k characters to preserve memory ...]';
      break;
    }
  }

  const averageCharsPerPage = maxPages > 0 ? totalChars / maxPages : 0;
  const isLikelyScanned = averageCharsPerPage < 100;

  return { text: fullText.trim(), pageCount, isLikelyScanned };
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const targetUrl = toTargetUrl(url);
    if (!targetUrl) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const token = (session as any)?.accessToken;

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fileRes = await fetch(targetUrl, { headers });
    if (!fileRes.ok) {
      return NextResponse.json({ error: `Failed to fetch file: ${fileRes.status}` }, { status: 502 });
    }

    const contentType = fileRes.headers.get('content-type') || '';
    if (!contentType.includes('pdf')) {
      return NextResponse.json({ error: `Not a PDF (content-type: ${contentType})` }, { status: 422 });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const { text, pageCount, isLikelyScanned } = await extractTextFromPdf(arrayBuffer);

    return NextResponse.json({ text, pageCount, isLikelyScanned });
  } catch (error) {
    console.error('[extract-pdf]', error);
    const message = (error as Error).message || 'Unknown error';
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 500 });
  }
}
