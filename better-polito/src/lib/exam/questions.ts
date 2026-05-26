import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AttemptConfig,
  Difficulty,
  ExamMode,
  Question,
  QuestionFacets,
  QuestionLanguage,
  RunnerQuestion,
  SourceFileFacet,
  SubjectConfig,
  TopicFacet,
} from '@/types/exam';

export function toRunnerQuestion(q: Question): RunnerQuestion {
  return {
    id: q.id,
    exam_type: q.exam_type,
    question_number: q.question_number,
    question_text: q.question_text,
    options: q.options?.map((o) => ({ label: o.label, text: o.text })) ?? null,
    difficulty: q.difficulty,
    topics: q.topics,
    has_formula: q.has_formula,
    has_diagram: q.has_diagram,
    language: q.language,
    year: q.year,
    subject: q.subject,
    original_question_image: q.original_question_image,
    question_image: q.question_image,
  };
}

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
    sourceFiles?: string[];
    difficulties?: Difficulty[];
    language?: QuestionLanguage | 'any';
  },
): Question[] {
  const topicSet = filters.topics && filters.topics.length > 0 ? new Set(filters.topics) : null;
  const sourceSet =
    filters.sourceFiles && filters.sourceFiles.length > 0 ? new Set(filters.sourceFiles) : null;
  const diffSet =
    filters.difficulties && filters.difficulties.length > 0 ? new Set(filters.difficulties) : null;
  const lang = filters.language && filters.language !== 'any' ? filters.language : null;

  return questions.filter((q) => {
    if (diffSet && !diffSet.has(q.difficulty)) return false;
    if (lang && q.language !== lang) return false;
    if (sourceSet && !sourceSet.has(q.source_file)) return false;
    if (topicSet) {
      const qTopics = q.topics ?? [];
      if (!qTopics.some((t) => topicSet.has(t))) return false;
    }
    return true;
  });
}

export function computeFacets(questions: Question[]): QuestionFacets {
  const topicMap = new Map<string, TopicFacet>();
  const sourceMap = new Map<string, SourceFileFacet>();
  const difficulties: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const languages: Record<QuestionLanguage, number> = { en: 0, it: 0 };

  for (const q of questions) {
    if (DIFFICULTIES.includes(q.difficulty)) difficulties[q.difficulty]++;
    if (LANGUAGES.includes(q.language)) languages[q.language]++;
    if (q.source_file) {
      let s = sourceMap.get(q.source_file);
      if (!s) {
        s = { source_file: q.source_file, total: 0 };
        sourceMap.set(q.source_file, s);
      }
      s.total++;
    }
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
  const sourceFiles = [...sourceMap.values()].sort(
    (a, b) => b.total - a.total || a.source_file.localeCompare(b.source_file),
  );
  return { total: questions.length, topics, sourceFiles, difficulties, languages };
}

export async function loadPool(subject: SubjectConfig, mode: ExamMode): Promise<Question[]> {
  const all = await loadSubjectQuestions(subject);
  return dedupe(all.filter((q) => q.exam_type === mode));
}

function shuffleOptionsOnQuestion(q: Question): Question {
  if (!q.options || q.options.length === 0) return q;
  
  const originalCorrect = q.options.find(o => o.label === q.correct_answer);
  const shuffled = shuffle(q.options);
  
  let newCorrectAnswer = q.correct_answer;
  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  const newOptions = shuffled.map((opt, i) => {
    const newLabel = LABELS[i] || String.fromCharCode(65 + i);
    if (opt === originalCorrect) {
      newCorrectAnswer = newLabel;
    }
    return { ...opt, label: newLabel };
  });
  
  return { ...q, options: newOptions, correct_answer: newCorrectAnswer };
}

export async function sampleExam(
  subject: SubjectConfig,
  mode: ExamMode,
  config: Pick<
    AttemptConfig,
    'topics' | 'sourceFiles' | 'difficulties' | 'language' | 'count' | 'shuffleQuestions' | 'shuffleOptions'
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
      sourceFiles: config.sourceFiles,
      difficulties: config.difficulties,
      language: config.language,
    });
  }
  const ordered = config.shuffleQuestions
    ? shuffle(candidates)
    : [...candidates].sort((a, b) => {
        const sa = a.source_file ?? '';
        const sb = b.source_file ?? '';
        if (sa !== sb) return sa.localeCompare(sb);
        const pa = a.page_number ?? 0;
        const pb = b.page_number ?? 0;
        if (pa !== pb) return pa - pb;
        return (a.question_number ?? 0) - (b.question_number ?? 0);
      });
  const sliced = ordered.slice(0, Math.max(0, config.count));
  return config.shuffleOptions ? sliced.map(shuffleOptionsOnQuestion) : sliced;
}
