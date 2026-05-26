import crypto from 'node:crypto';
import type { Question, ScoringRules } from '@/types/exam';

const TTL_MS = 6 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.EXAM_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error('EXAM_TOKEN_SECRET env var missing or too short (>=16 chars)');
  }
  return s;
}

export interface AttemptPayload {
  subject: string;
  mode: string;
  startedAt: number;
  durationMin: number;
  scoring: ScoringRules;
  passScore: number;
  questions: Question[];
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signAttempt(payload: AttemptPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf-8'));
  const sig = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyAttempt(token: string): AttemptPayload {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Malformed token');
  const [body, sig] = parts;
  const expected = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid token signature');
  }
  const payload = JSON.parse(b64urlDecode(body).toString('utf-8')) as AttemptPayload;
  if (Date.now() - payload.startedAt > TTL_MS) {
    throw new Error('Attempt token expired');
  }
  return payload;
}
