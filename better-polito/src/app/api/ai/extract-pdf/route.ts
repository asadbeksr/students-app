export const runtime = 'nodejs';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

// Polyfill DOMMatrix for Node.js environment if it's missing (required by pdfjs-dist)
if (typeof global !== 'undefined' && typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    a=1; b=0; c=0; d=1; e=0; f=0;
    m11=1; m12=0; m13=0; m14=0;
    m21=0; m22=1; m23=0; m24=0;
    m31=0; m32=0; m33=1; m34=0;
    m41=0; m42=0; m43=0; m44=1;
    constructor(init?: string | number[]) {
      if (Array.isArray(init)) {
        if (init.length === 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
          this.m11=this.a; this.m12=this.b; this.m21=this.c; this.m22=this.d; this.m41=this.e; this.m42=this.f;
        } else if (init.length === 16) {
          [this.m11,this.m12,this.m13,this.m14,this.m21,this.m22,this.m23,this.m24,
           this.m31,this.m32,this.m33,this.m34,this.m41,this.m42,this.m43,this.m44] = init;
          this.a=this.m11; this.b=this.m12; this.c=this.m21; this.d=this.m22; this.e=this.m41; this.f=this.m42;
        }
      }
    }
    transformPoint(p: any) { return { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0, w: p.w ?? 1 }; }
    multiply(_other: any) { return new (global as any).DOMMatrix(); }
    inverse() { return new (global as any).DOMMatrix(); }
    translate(_tx=0, _ty=0, _tz=0) { return new (global as any).DOMMatrix(); }
    scale(_s=1) { return new (global as any).DOMMatrix(); }
  };
}

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

  // Disable the worker — node_modules is not available at runtime on serverless platforms (e.g. Vercel).
  // Running in the main thread is fine for a server-side API route.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as any).promise;
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
