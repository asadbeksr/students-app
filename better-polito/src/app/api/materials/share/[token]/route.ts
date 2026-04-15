import { NextRequest, NextResponse } from 'next/server';
import { shareStore } from '@/lib/materials/shareStore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

const POLITO_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH ?? 'https://app.didattica.polito.it';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const entry = shareStore.get(token);

  if (!entry) {
    return NextResponse.json({ error: 'Link expired or not found' }, { status: 404 });
  }

  // Resolve the internal URL to a Polito API URL
  const internalUrl = entry.internalUrl; // e.g. /api/polito/courses/123/files/456
  let targetUrl: string;

  if (internalUrl.startsWith('/api/polito/')) {
    const apiPath = internalUrl.replace(/^\/api\/polito\/?/, '');
    targetUrl = `${POLITO_BASE}/api/${apiPath}`;
  } else {
    targetUrl = internalUrl;
  }

  // Use server-side session auth to fetch from Polito
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  try {
    const res = await fetch(targetUrl, { headers });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': res.headers.get('Content-Disposition') ?? 'inline',
        // Public caching OK — token is already scoped and short-lived
        'Cache-Control': 'public, max-age=3600',
        // Allow NotebookLM crawler to access this resource
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}
