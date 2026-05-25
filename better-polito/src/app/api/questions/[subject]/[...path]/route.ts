import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getSubject } from '@/config/subjects';

const QUESTIONS_ROOT = path.join(process.cwd(), 'src', 'questions');

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subject: string; path: string[] }> },
) {
  const { subject, path: parts } = await params;
  const subjectCfg = getSubject(subject);
  if (!subjectCfg) return new NextResponse('Unknown subject', { status: 404 });

  const subjectDir = path.join(QUESTIONS_ROOT, subjectCfg.folder);
  const target = path.resolve(subjectDir, ...parts);
  if (!target.startsWith(subjectDir + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const data = await fs.readFile(target);
    const type = MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
