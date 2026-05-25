import type { SubjectConfig } from '@/types/exam';

export const SUBJECTS: SubjectConfig[] = [
  {
    slug: 'chemistry',
    name: 'Chemistry',
    folder: 'Chemistry',
    description: 'General chemistry exam prep — stoichiometry, thermodynamics, acid–base.',
    modes: {
      mcq: {
        questionCount: 15,
        durationMin: 25,
        passScore: 60,
        shuffle: true,
        scoring: { correct: 0.6, wrong: -0.12, blank: 0 },
      },
      written: { questionCount: 4, durationMin: 60 },
    },
  },
  {
    slug: 'mathematical-analysis-1',
    name: 'Mathematical Analysis I',
    folder: 'Mathematical_Analysis_1',
    description: 'Mathematical Analysis I exam prep.',
    modes: {
      mcq: {
        questionCount: 15,
        durationMin: 45,
        passScore: 53.33,
        shuffle: true,
        scoring: { correct: 1, wrong: 0, blank: 0 },
      },
      written: { questionCount: 3, durationMin: 90 },
    },
  },
];

export function getSubject(slug: string): SubjectConfig | undefined {
  return SUBJECTS.find((s) => s.slug === slug.toLowerCase());
}
