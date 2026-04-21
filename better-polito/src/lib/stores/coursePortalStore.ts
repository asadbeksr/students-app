import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PreviewFile {
  id: string;
  name: string;
  url: string;
}

export interface CoursePortalState {
  chat: boolean;
  year: string;
  tab: 'teaching' | 'dropbox' | 'virtual';
  view: 'list' | 'grid';
  sidebar: boolean;
  folders: string[];
  grid: string[];
  preview: PreviewFile | null;
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

// Separate non-persisted store for document content cache
interface DocumentContentCache {
  // fileId -> { text, extracting }
  cache: Record<string, { text: string; extracting: boolean }>;
  setExtracting: (fileId: string) => void;
  setContent: (fileId: string, text: string) => void;
  getContent: (fileId: string) => { text: string; extracting: boolean } | null;
}

export const useDocumentContentStore = create<DocumentContentCache>((set, get) => ({
  cache: {},
  setExtracting: (fileId) => {
    set(state => ({
      cache: { ...state.cache, [fileId]: { text: '', extracting: true } },
    }));
  },
  setContent: (fileId, text) => {
    set(state => ({
      cache: { ...state.cache, [fileId]: { text, extracting: false } },
    }));
  },
  getContent: (fileId) => {
    return get().cache[fileId] || null;
  },
}));

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
      version: 2,
      migrate: (state: any) => {
        // Clear persisted previews that are missing the url field
        if (state?.states) {
          for (const courseId of Object.keys(state.states)) {
            const preview = state.states[courseId]?.preview;
            if (preview && !preview.url) {
              state.states[courseId].preview = null;
            }
          }
        }
        return state;
      },
    }
  )
);
