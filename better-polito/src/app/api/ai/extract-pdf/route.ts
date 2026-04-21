export const runtime = 'nodejs';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer, options?: { max?: number }) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

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
  const data = await pdfParse(Buffer.from(buffer), { max: 50 });

  const pageCount = data.numpages;
  let text = data.text;

  if (text.length > 100000) {
    text = text.slice(0, 100000) + '\n\n[... Extraction stopped at 100k characters to preserve memory ...]';
  }

  const averageCharsPerPage = pageCount > 0 ? text.length / pageCount : 0;
  const isLikelyScanned = averageCharsPerPage < 100;

  return { text: text.trim(), pageCount, isLikelyScanned };
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
