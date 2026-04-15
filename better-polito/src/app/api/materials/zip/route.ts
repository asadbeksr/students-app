import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { authOptions } from '@/lib/auth/auth';

const POLITO_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH ?? 'https://app.didattica.polito.it';

interface ZipRequestFile {
  url?: string;
  name?: string;
  archivePath?: string;
}

function sanitizeArchivePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
}

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string } | null)?.accessToken;

  const payload = await req.json().catch(() => null) as {
    archiveName?: string;
    files?: ZipRequestFile[];
  } | null;

  const normalizedPayload: {
    archiveName?: string;
    files?: ZipRequestFile[];
  } = payload ?? {};

  const requestedFiles: ZipRequestFile[] = Array.isArray(normalizedPayload.files) ? normalizedPayload.files : [];
  if (!requestedFiles.length) {
    return NextResponse.json({ error: 'No files selected' }, { status: 400 });
  }

  const archiveNameRaw = normalizedPayload.archiveName ?? 'materials.zip';
  const archiveName = archiveNameRaw.endsWith('.zip')
    ? archiveNameRaw
    : `${archiveNameRaw}.zip`;

  const zip = new JSZip();

  for (const entry of requestedFiles) {
    const rawUrl = entry.url;
    if (!rawUrl) continue;

    const targetUrl = toTargetUrl(rawUrl);
    if (!targetUrl) continue;

    const headers: Record<string, string> = {};
    if (targetUrl.startsWith(`${POLITO_BASE}/api/`) && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(targetUrl, { headers });
      if (!response.ok) continue;

      const arrayBuffer = await response.arrayBuffer();
      const fallbackName = entry.name?.trim() || 'file';
      const archivePath = sanitizeArchivePath(entry.archivePath?.trim() || fallbackName);
      if (!archivePath) continue;

      zip.file(archivePath, arrayBuffer);
    } catch {
      // Continue zipping remaining files.
    }
  }

  const zippedContent = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  if (!zippedContent.length) {
    return NextResponse.json({ error: 'Unable to build zip archive' }, { status: 500 });
  }

  return new NextResponse(zippedContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archiveName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
