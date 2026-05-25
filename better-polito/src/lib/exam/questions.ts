import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExamMode, Question, SubjectConfig } from '@/types/exam';

const QUESTIONS_ROOT = path.join(process.cwd(), 'src', 'questions');

function rewriteImagePath(subjectSlug: string, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.replace(/^\.?\//, '');
  return `/api/questions/${subjectSlug}/${clean}`;
}

export async function loadSubjectQuestions(subject: SubjectConfig): Promise<Question[]> {
  const file = path.join(QUESTIONS_ROOT, subject.folder, `${subject.folder}.json`);
  const raw = await fs.readFile(file, 'utf-8');
  const data = JSON.parse(raw) as Question[];
  return data.map((q) => ({
    ...q,
    original_question_image: rewriteImagePath(subject.slug, q.original_question_image),
    question_image: rewriteImagePath(subject.slug, q.question_image),
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function sampleExam(
  subject: SubjectConfig,
  mode: ExamMode,
  count: number,
  shuffleQuestions = true,
): Promise<Question[]> {
  const all = await loadSubjectQuestions(subject);
  const filtered = all.filter((q) => q.exam_type === mode);
  const seen = new Set<string>();
  const unique: Question[] = [];
  for (const q of filtered) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    unique.push(q);
  }
  const pool = shuffleQuestions ? shuffle(unique) : unique;
  return pool.slice(0, count);
}
