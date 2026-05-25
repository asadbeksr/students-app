import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AttemptConfig,
  Difficulty,
  ExamMode,
  Question,
  QuestionFacets,
  QuestionLanguage,
  SubjectConfig,
  TopicFacet,
} from '@/types/exam';

const QUESTIONS_ROOT = path.join(process.cwd(), 'src', 'questions');
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const LANGUAGES: QuestionLanguage[] = ['en', 'it'];

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

function dedupe(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of questions) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

export function filterPool(
  questions: Question[],
  filters: {
    topics?: string[];
    difficulties?: Difficulty[];
    language?: QuestionLanguage | 'any';
  },
): Question[] {
  const topicSet = filters.topics && filters.topics.length > 0 ? new Set(filters.topics) : null;
  const diffSet =
    filters.difficulties && filters.difficulties.length > 0 ? new Set(filters.difficulties) : null;
  const lang = filters.language && filters.language !== 'any' ? filters.language : null;

  return questions.filter((q) => {
    if (diffSet && !diffSet.has(q.difficulty)) return false;
    if (lang && q.language !== lang) return false;
    if (topicSet) {
      const qTopics = q.topics ?? [];
      if (!qTopics.some((t) => topicSet.has(t))) return false;
    }
    return true;
  });
}

export function computeFacets(questions: Question[]): QuestionFacets {
  const topicMap = new Map<string, TopicFacet>();
  const difficulties: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const languages: Record<QuestionLanguage, number> = { en: 0, it: 0 };

  for (const q of questions) {
    if (DIFFICULTIES.includes(q.difficulty)) difficulties[q.difficulty]++;
    if (LANGUAGES.includes(q.language)) languages[q.language]++;
    for (const t of q.topics ?? []) {
      let facet = topicMap.get(t);
      if (!facet) {
        facet = { topic: t, total: 0, byDifficulty: { easy: 0, medium: 0, hard: 0 } };
        topicMap.set(t, facet);
      }
      facet.total++;
      if (DIFFICULTIES.includes(q.difficulty)) facet.byDifficulty[q.difficulty]++;
    }
  }

  const topics = [...topicMap.values()].sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
  return { total: questions.length, topics, difficulties, languages };
}

export async function loadPool(subject: SubjectConfig, mode: ExamMode): Promise<Question[]> {
  const all = await loadSubjectQuestions(subject);
  return dedupe(all.filter((q) => q.exam_type === mode));
}

function shuffleOptionsOnQuestion(q: Question): Question {
  if (!q.options || q.options.length === 0) return q;
  return { ...q, options: shuffle(q.options) };
}

export async function sampleExam(
  subject: SubjectConfig,
  mode: ExamMode,
  config: Pick<
    AttemptConfig,
    'topics' | 'difficulties' | 'language' | 'count' | 'shuffleQuestions' | 'shuffleOptions'
  > & { questionIds?: string[] },
): Promise<Question[]> {
  const pool = await loadPool(subject, mode);
  let candidates: Question[];
  if (config.questionIds && config.questionIds.length > 0) {
    const wanted = new Set(config.questionIds);
    candidates = pool.filter((q) => wanted.has(q.id));
  } else {
    candidates = filterPool(pool, {
      topics: config.topics,
      difficulties: config.difficulties,
      language: config.language,
    });
  }
  const ordered = config.shuffleQuestions ? shuffle(candidates) : candidates;
  const sliced = ordered.slice(0, Math.max(0, config.count));
  return config.shuffleOptions ? sliced.map(shuffleOptionsOnQuestion) : sliced;
}
