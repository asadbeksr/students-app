import { create } from 'zustand';
import { db } from '@/lib/db';
import type { MockExam, ExamAttempt } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { analyzeExamAttempt } from '@/lib/examAnalytics';

interface ExamStore {
  exams: MockExam[];
  attempts: ExamAttempt[];
  currentAttempt: ExamAttempt | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchExams: (courseId: string) => Promise<void>;
  fetchAttempts: (courseId: string) => Promise<void>;
  createExam: (data: Omit<MockExam, 'id' | 'createdAt'>) => Promise<MockExam>;
  deleteExam: (id: string) => Promise<void>;
  startAttempt: (examId: string, courseId: string) => Promise<ExamAttempt>;
  answerQuestion: (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => void;
  submitAttempt: () => Promise<ExamAttempt>;
  getAttempt: (attemptId: string) => Promise<ExamAttempt | null>;
}

export const useExamStore = create<ExamStore>((set, get) => ({
  exams: [],
  attempts: [],
  currentAttempt: null,
  loading: false,
  error: null,

  fetchExams: async (courseId) => {
    set({ loading: true, error: null });
    try {
      const exams = await db.mockExams
        .where('courseId')
        .equals(courseId)
        .toArray();
      set({ exams, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAttempts: async (courseId) => {
    try {
      const attempts = await db.examAttempts
        .where('courseId')
        .equals(courseId)
        .toArray();
      set({ attempts });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createExam: async (data) => {
    const exam: MockExam = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    await db.mockExams.add(exam);
    await get().fetchExams(data.courseId);
    return exam;
  },

  deleteExam: async (id) => {
    const exam = await db.mockExams.get(id);
    if (!exam) return;

    await db.transaction('rw', [db.mockExams, db.examAttempts], async () => {
      await db.mockExams.delete(id);
      await db.examAttempts.where('examId').equals(id).delete();
    });

    await get().fetchExams(exam.courseId);
  },

  startAttempt: async (examId, courseId) => {
    const exam = await db.mockExams.get(examId);
    if (!exam) throw new Error('Exam not found');

    const attempt: ExamAttempt = {
      id: uuidv4(),
      examId,
      courseId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      timeSpentSeconds: 0,
      answers: exam.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: null,
        isCorrect: false,
        timeTakenSeconds: 0,
      })),
      score: 0,
      totalQuestions: exam.questions.length,
      analytics: {
        scorePercentage: 0,
        topicBreakdown: [],
        weakAreas: [],
      },
    };

    set({ currentAttempt: attempt });
    return attempt;
  },

  answerQuestion: (questionId, answer) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;

    const updatedAnswers = currentAttempt.answers.map(a =>
      a.questionId === questionId ? { ...a, selectedAnswer: answer } : a
    );

    set({
      currentAttempt: {
        ...currentAttempt,
        answers: updatedAnswers,
      },
    });
  },

  submitAttempt: async () => {
    const { currentAttempt } = get();
    if (!currentAttempt) throw new Error('No active attempt');

    const exam = await db.mockExams.get(currentAttempt.examId);
    if (!exam) throw new Error('Exam not found');

    // Calculate scores
    const answersWithCorrect = currentAttempt.answers.map(a => {
      const question = exam.questions.find(q => q.id === a.questionId);
      return {
        ...a,
        isCorrect: question ? a.selectedAnswer === question.correctAnswer : false,
      };
    });

    const score = answersWithCorrect.filter(a => a.isCorrect).length;
    const timeSpent = Math.floor(
      (new Date().getTime() - new Date(currentAttempt.startedAt).getTime()) / 1000
    );

    // Get materials for analytics
    const materials = await db.materials
      .where('courseId')
      .equals(currentAttempt.courseId)
      .toArray();

    const completedAttempt: ExamAttempt = {
      ...currentAttempt,
      completedAt: new Date().toISOString(),
      timeSpentSeconds: timeSpent,
      answers: answersWithCorrect,
      score,
      analytics: analyzeExamAttempt(
        { ...currentAttempt, answers: answersWithCorrect, score },
        exam.questions,
        materials
      ),
    };

    await db.examAttempts.add(completedAttempt);
    set({ currentAttempt: null });
    await get().fetchAttempts(currentAttempt.courseId);

    return completedAttempt;
  },

  getAttempt: async (attemptId) => {
    try {
      const attempt = await db.examAttempts.get(attemptId);
      return attempt || null;
    } catch {
      return null;
    }
  },
}));
