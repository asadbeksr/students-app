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
      written: { questionCount: 3, durationMin: 60 },
    },
  },
];

export function getSubject(slug: string): SubjectConfig | undefined {
  return SUBJECTS.find((s) => s.slug === slug.toLowerCase());
}
