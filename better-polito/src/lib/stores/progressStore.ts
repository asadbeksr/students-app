import { create } from 'zustand';
import { db } from '@/lib/db';

export type FolderTag = 'lecture' | 'practice';

interface ProgressState {
  // in-memory cache: courseId -> progress
  _cache: Record<string, { completedFileIds: string[]; folderTags: Record<string, FolderTag> }>;

  toggleFileComplete: (courseId: string, fileId: string) => Promise<void>;
  setFolderTag: (courseId: string, folderId: string, tag: FolderTag | null) => Promise<void>;
  isFileComplete: (courseId: string, fileId: string) => boolean;
  getFolderTag: (courseId: string, folderId: string) => FolderTag | null;
  loadCourse: (courseId: string) => Promise<void>;
}

async function getOrCreate(courseId: string) {
  let row = await db.courseProgress.get(courseId);
  if (!row) {
    row = { courseId, completedFileIds: [], folderTags: {} };
    await db.courseProgress.put(row);
  }
  return row;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  _cache: {},

  loadCourse: async (courseId) => {
    if (get()._cache[courseId]) return;
    const row = await getOrCreate(courseId);
    set(s => ({ _cache: { ...s._cache, [courseId]: { completedFileIds: row.completedFileIds, folderTags: row.folderTags } } }));
  },

  toggleFileComplete: async (courseId, fileId) => {
    const row = await getOrCreate(courseId);
    const has = row.completedFileIds.includes(fileId);
    const next = has ? row.completedFileIds.filter(id => id !== fileId) : [...row.completedFileIds, fileId];
    await db.courseProgress.put({ ...row, completedFileIds: next });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], completedFileIds: next } } }));
  },

  setFolderTag: async (courseId, folderId, tag) => {
    const row = await getOrCreate(courseId);
    const tags = { ...row.folderTags };
    if (tag === null) delete tags[folderId];
    else tags[folderId] = tag;
    await db.courseProgress.put({ ...row, folderTags: tags });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], folderTags: tags } } }));
  },

  isFileComplete: (courseId, fileId) =>
    get()._cache[courseId]?.completedFileIds.includes(fileId) ?? false,

  getFolderTag: (courseId, folderId) =>
    get()._cache[courseId]?.folderTags[folderId] ?? null,
}));
