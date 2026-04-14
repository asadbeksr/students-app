import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Course, Folder } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CourseStore {
  courses: Course[];
  selectedCourse: Course | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchCourses: () => Promise<void>;
  createCourse: (data: {
    name: string;
    subject: 'Mathematics' | 'Physics' | 'Chemistry';
    examDate: string;
    knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
  }) => Promise<Course>;
  updateCourse: (id: string, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  selectCourse: (id: string) => Promise<void>;
  clearSelection: () => void;
  updateProgress: (courseId: string) => Promise<void>;
}

export const useCourseStore = create<CourseStore>((set, get) => ({
  courses: [],
  selectedCourse: null,
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true, error: null });
    try {
      const courses = await db.courses.toArray();
      set({ courses, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createCourse: async (data) => {
    const now = new Date().toISOString();
    const course: Course = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
      studyPlan: null,
      progress: {
        completedMaterials: [],
        totalMaterials: 0,
        completionPercentage: 0,
        totalStudyTimeSeconds: 0,
      },
    };

    await db.courses.add(course);

    // Create default folders
    const lecturesFolder: Folder = {
      id: uuidv4(),
      courseId: course.id,
      name: 'Lectures',
      parentId: null,
      order: 0,
      createdAt: now,
    };

    const exercisesFolder: Folder = {
      id: uuidv4(),
      courseId: course.id,
      name: 'Exercises',
      parentId: null,
      order: 1,
      createdAt: now,
    };

    const examRequirementsFolder: Folder = {
      id: uuidv4(),
      courseId: course.id,
      name: 'Exam Requirements',
      parentId: null,
      order: 2,
      createdAt: now,
    };

    const uploadsFolder: Folder = {
      id: uuidv4(),
      courseId: course.id,
      name: 'Uploads',
      parentId: null,
      order: 3,
      createdAt: now,
    };

    await db.folders.bulkAdd([lecturesFolder, exercisesFolder, examRequirementsFolder, uploadsFolder]);

    await get().fetchCourses();
    return course;
  },

  updateCourse: async (id, updates) => {
    await db.courses.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await get().fetchCourses();
    
    // Update selected course if it's the one being updated
    if (get().selectedCourse?.id === id) {
      const updated = await db.courses.get(id);
      if (updated) set({ selectedCourse: updated });
    }
  },

  deleteCourse: async (id) => {
    // Delete all related data
    await db.transaction('rw', [db.courses, db.folders, db.materials, db.chatMessages, db.mockExams, db.examAttempts], async () => {
      await db.courses.delete(id);
      await db.folders.where('courseId').equals(id).delete();
      await db.materials.where('courseId').equals(id).delete();
      await db.chatMessages.where('courseId').equals(id).delete();
      await db.mockExams.where('courseId').equals(id).delete();
      await db.examAttempts.where('courseId').equals(id).delete();
    });

    if (get().selectedCourse?.id === id) {
      set({ selectedCourse: null });
    }

    await get().fetchCourses();
  },

  selectCourse: async (id) => {
    const course = await db.courses.get(id);
    if (course) {
      set({ selectedCourse: course });
    }
  },

  clearSelection: () => {
    set({ selectedCourse: null });
  },

  updateProgress: async (courseId) => {
    const materials = await db.materials.where('courseId').equals(courseId).toArray();
    const completedMaterials = materials.filter(m => m.isCompleted).map(m => m.id);
    const completionPercentage = materials.length > 0
      ? Math.round((completedMaterials.length / materials.length) * 100)
      : 0;

    await db.courses.update(courseId, {
      'progress.completedMaterials': completedMaterials,
      'progress.totalMaterials': materials.length,
      'progress.completionPercentage': completionPercentage,
    });

    await get().fetchCourses();
    if (get().selectedCourse?.id === courseId) {
      await get().selectCourse(courseId);
    }
  },
}));
