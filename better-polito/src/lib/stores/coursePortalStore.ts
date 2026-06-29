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
  previewPage: number | null;
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
  previewPage: null,
};

// Structured metadata for an extracted open document. Replaces the old
// stringly-typed `{ text, extracting }` shape so callers (chat route, send
// flow) can reason about real states instead of regexing English prose.
export interface DocumentContent {
  text: string;        // full extracted text (with `--- Page N ---` markers when available)
  pageCount: number;
  isScanned: boolean;
  status: 'extracting' | 'ready' | 'failed';
}

// Separate non-persisted, in-memory read cache for document content.
interface DocumentContentCache {
  cache: Record<string, DocumentContent>;
  setStatus: (fileId: string, status: DocumentContent['status']) => void;
  setContent: (fileId: string, content: DocumentContent) => void;
  getContent: (fileId: string) => DocumentContent | null;
}

export const useDocumentContentStore = create<DocumentContentCache>((set, get) => ({
  cache: {},
  setStatus: (fileId, status) => {
    set(state => {
      const prev = state.cache[fileId] ?? { text: '', pageCount: 0, isScanned: false, status };
      return { cache: { ...state.cache, [fileId]: { ...prev, status } } };
    });
  },
  setContent: (fileId, content) => {
    set(state => ({
      cache: { ...state.cache, [fileId]: content },
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
      migrate: (persisted: unknown) => {
        const state = persisted as { states?: Record<string, { preview?: { url?: string } | null }> } | undefined;
        // Clear persisted previews that are missing the url field
        if (state?.states) {
          for (const courseId of Object.keys(state.states)) {
            const preview = state.states[courseId]?.preview;
            if (preview && !preview.url) {
              state.states[courseId].preview = null;
            }
          }
        }
        return state as unknown as CoursePortalStore;
      },
    }
  )
);
