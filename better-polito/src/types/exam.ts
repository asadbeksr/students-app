export type ExamType = 'mcq' | 'written' | 'oral' | 'true_false';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionLanguage = 'en' | 'it';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  exam_type: ExamType;
  question_number: number;
  question_text: string;
  options?: QuestionOption[] | null;
  correct_answer?: string | null;
  solution?: string | null;
  difficulty: Difficulty;
  topics: string[];
  has_formula: boolean;
  has_diagram: boolean;
  language: QuestionLanguage;
  page_number: number;
  subject: string;
  year: number | string;
  subcategory: string | null;
  source_file: string;
  original_question_image: string | null;
  question_image: string | null;
}

export type ExamMode = 'mcq' | 'written';

export interface ScoringRules {
  correct: number;
  wrong: number;
  blank: number;
}

export interface ModeConfig {
  questionCount: number;
  durationMin: number;
  passScore?: number;
  shuffle?: boolean;
  scoring?: ScoringRules;
}

export interface SubjectConfig {
  slug: string;
  name: string;
  folder: string;
  description?: string;
  modes: Partial<Record<ExamMode, ModeConfig>>;
}

export type LanguageFilter = QuestionLanguage | 'any';

export interface AttemptConfig {
  topics: string[];
  difficulties: Difficulty[];
  language: LanguageFilter;
  count: number;
  durationMin: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  scoring: ScoringRules;
  passScore: number;
  questionIds?: string[];
}

export interface TopicFacet {
  topic: string;
  total: number;
  byDifficulty: Record<Difficulty, number>;
}

export interface QuestionFacets {
  total: number;
  topics: TopicFacet[];
  difficulties: Record<Difficulty, number>;
  languages: Record<QuestionLanguage, number>;
}

export interface CatalogEntry {
  id: string;
  topics: string[];
  difficulty: Difficulty;
  language: QuestionLanguage;
}

export interface FacetsResponse extends QuestionFacets {
  catalog: CatalogEntry[];
}
