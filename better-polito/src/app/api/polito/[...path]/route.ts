import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/auth';

const POLITO_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH ?? 'https://app.didattica.polito.it';

type PolitoRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handler(req: NextRequest, context: PolitoRouteContext) {
  const { path } = await context.params;
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;

  const apiPath = path.join('/');
  const search = req.nextUrl.search ?? '';
  const targetUrl = `${POLITO_BASE}/api/${apiPath}${search}`;

  if (!token) {
    console.error(`[PoliTO API Proxy] Unauthorized: No token found for /${apiPath}`);
    return NextResponse.json({ error: 'Unauthorized: No valid session token' }, { status: 401 });
  }

  const headers: Record<string, string> = {
    'Accept-Language': req.headers.get('accept-language') ?? 'en',
    'Authorization': `Bearer ${token}`
  };

  // Forward critical browser headers (avoids strict WAF blocks)
  const ua = req.headers.get('user-agent');
  if (ua) headers['User-Agent'] = ua;

  const accept = req.headers.get('accept');
  if (accept) headers['Accept'] = accept;

  // Forward Content-Type for non-GET requests
  const reqContentType = req.headers.get('content-type');
  if (reqContentType) headers['Content-Type'] = reqContentType;

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();

  const res = await fetch(targetUrl, { method: req.method, headers, body });

  const contentType = res.headers.get('Content-Type') ?? 'application/json';
  const isBinary = !contentType.includes('application/json') && !contentType.includes('text/');

  // ── Dev logging ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const label = `[PoliTO API] ${req.method} /${apiPath}${search} → ${res.status} (${contentType})`;
    if (isBinary) {
      console.log(label, '[binary]');
    } else {
      const text = await res.clone().text();
      try { console.log(label); console.dir(JSON.parse(text), { depth: null }); }
      catch { console.log(label, text.slice(0, 500)); }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Stream binary responses (PDFs, images, etc.) as raw bytes
  if (isBinary) {
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': res.headers.get('Content-Disposition') ?? '',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': contentType },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;

