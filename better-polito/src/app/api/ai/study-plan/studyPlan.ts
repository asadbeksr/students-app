import { Type } from '@google/genai';

// Constrains the model to the exact shape StudyPlanner.tsx renders, so a
// truncated/rambling response can't break JSON parsing.
export const STUDY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    weeks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ['subject', 'description'],
            },
          },
        },
        required: ['label', 'tasks'],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ['weeks', 'summary'],
};

export interface StudyPlan {
  weeks: { label: string; tasks: { subject: string; description: string }[] }[];
  summary: string;
}

/** Parse the model output into a StudyPlan, salvaging a JSON block if needed. */
export function parseStudyPlan(raw: string): StudyPlan | null {
  const tryParse = (s: string): StudyPlan | null => {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === 'object' && Array.isArray(obj.weeks)) return obj as StudyPlan;
    } catch { /* fall through */ }
    return null;
  };
  return tryParse(raw) ?? tryParse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
}
