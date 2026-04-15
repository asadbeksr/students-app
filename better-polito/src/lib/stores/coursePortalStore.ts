import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CoursePortalState {
  chat: boolean;
  year: string;
  tab: 'teaching' | 'dropbox' | 'virtual';
  view: 'list' | 'grid';
  sidebar: boolean;
  folders: string[];
  grid: string[];
  preview: string | null;
}

const defaultState: CoursePortalState = {
  chat: false,
  year: '',
  tab: 'teaching',
  view: 'list',
  sidebar: false,
  folders: [],
  grid: [],
  preview: null,
};

interface CoursePortalStore {
  states: Record<string, CoursePortalState>;
  getCourseState: (courseId: string) => CoursePortalState;
  updateCourseState: (courseId: string, updates: Partial<CoursePortalState>) => void;
}

export const useCoursePortalStore = create<CoursePortalStore>()(
  persist(
    (set, get) => ({
      states: {},
      getCourseState: (courseId) => {
        return get().states[courseId] || defaultState;
      },
      updateCourseState: (courseId, updates) => {
        set((state) => {
          const currentState = state.states[courseId] || defaultState;
          
          // Optimization to prevent needless state churn if nothing actually changes
          const hasChanges = Object.entries(updates).some(
            ([key, value]) => currentState[key as keyof CoursePortalState] !== value
          );
          
          if (!hasChanges) return state;

          return {
            states: {
              ...state.states,
              [courseId]: {
                ...currentState,
                ...updates,
              },
            },
          };
        });
      },
    }),
    {
      name: 'better-polito:course-portal',
    }
  )
);
