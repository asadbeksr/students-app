// Modified from polito/students-app — 2026-04-13
export type SuccessResponse<T> = { data: T };

export interface Exam {
  id: number;
  courseName: string;
  courseShortcode: string;
  moduleNumber: number;
  examStartsAt: Date | null;
  examEndsAt: Date | null;
  status: string;
  isTimeToBeDefined: boolean;
  uniqueShortcode: string;
  [key: string]: unknown;
}

export interface CourseOverview {
  id: number;
  name: string;
  shortcode: string;
  modules?: unknown[];
  uniqueShortcode: string;
  [key: string]: unknown;
}
