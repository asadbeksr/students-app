import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/auth';
import { shareStore } from '@/lib/materials/shareStore';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { files?: { internalUrl: string; name: string }[] } | null;
  const files = Array.isArray(body?.files) ? body!.files : [];

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  // Prefer an explicit public base URL (needed when running behind ngrok / Cloudflare Tunnel)
  const publicBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    (req.headers.get('origin') ?? req.nextUrl.origin);

  const isLocalhost = publicBase.includes('localhost') || publicBase.includes('127.0.0.1');

  const publicFiles = files.map(({ internalUrl, name }) => {
    const token = shareStore.create(internalUrl);
    return {
      name,
      publicUrl: `${publicBase}/api/materials/share/${token}`,
    };
  });

  return NextResponse.json({ files: publicFiles, isLocalhost });
}

