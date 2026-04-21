import { create } from 'zustand';
import { db } from '@/lib/db';

export type FolderTag = string;

export type TagProgressSummary = {
  totalTagged: number;
  completedTagged: number;
  totalPct: number;
  perTag: { tagName: string; color: string; total: number; completed: number; pct: number }[];
};

export const TAG_PALETTE = [
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
];

export const BUILTIN_COLORS: Record<string, string> = {
  lecture: '#3b82f6',
  practice: '#f59e0b',
};

function nextPaletteColor(usedColors: string[]): string {
  for (const c of TAG_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return TAG_PALETTE[usedColors.length % TAG_PALETTE.length];
}

interface CacheEntry {
  completedFileIds: string[];
  folderTags: Record<string, string>;
  tagDefs: Record<string, string>;
}

interface ProgressState {
  _cache: Record<string, CacheEntry>;

  loadCourse: (courseId: string) => Promise<void>;
  toggleFileComplete: (courseId: string, fileId: string) => Promise<void>;
  isFileComplete: (courseId: string, fileId: string) => boolean;

  setFolderTag: (courseId: string, folderId: string, tag: FolderTag | null) => Promise<void>;
  getFolderTag: (courseId: string, folderId: string) => FolderTag | null;

  getTagDefs: (courseId: string) => Record<string, string>;
  getTagColor: (courseId: string, tagName: string) => string;
  createTag: (courseId: string, tagName: string, color?: string) => Promise<void>;
  upsertTagDef: (courseId: string, tagName: string, color: string) => Promise<void>;
  renameTag: (courseId: string, oldName: string, newName: string) => Promise<void>;
  deleteTag: (courseId: string, tagName: string) => Promise<void>;
}

async function getOrCreate(courseId: string) {
  let row = await db.courseProgress.get(courseId);
  if (!row) {
    row = { courseId, completedFileIds: [], folderTags: {}, tagDefs: {} };
    await db.courseProgress.put(row);
  }
  if (!row.tagDefs) row.tagDefs = {};
  return row as Required<typeof row>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  _cache: {},

  loadCourse: async (courseId) => {
    if (get()._cache[courseId]) return;
    const row = await getOrCreate(courseId);
    set(s => ({
      _cache: {
        ...s._cache,
        [courseId]: {
          completedFileIds: row.completedFileIds,
          folderTags: row.folderTags,
          tagDefs: row.tagDefs,
        },
      },
    }));
  },

  toggleFileComplete: async (courseId, fileId) => {
    const row = await getOrCreate(courseId);
    const has = row.completedFileIds.includes(fileId);
    const next = has ? row.completedFileIds.filter(id => id !== fileId) : [...row.completedFileIds, fileId];
    await db.courseProgress.put({ ...row, completedFileIds: next });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], completedFileIds: next } } }));
  },

  isFileComplete: (courseId, fileId) =>
    get()._cache[courseId]?.completedFileIds.includes(fileId) ?? false,

  setFolderTag: async (courseId, folderId, tag) => {
    const row = await getOrCreate(courseId);
    const folderTags = { ...row.folderTags };
    const tagDefs = { ...row.tagDefs };

    if (tag === null) {
      delete folderTags[folderId];
    } else {
      folderTags[folderId] = tag;
      if (!tagDefs[tag]) {
        tagDefs[tag] = BUILTIN_COLORS[tag] ?? nextPaletteColor(Object.values(tagDefs));
      }
    }

    await db.courseProgress.put({ ...row, folderTags, tagDefs });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], folderTags, tagDefs } } }));
  },

  getFolderTag: (courseId, folderId) =>
    get()._cache[courseId]?.folderTags[folderId] ?? null,

  getTagDefs: (courseId) => {
    const cache = get()._cache[courseId];
    if (!cache) return {};
    // Include any tags in use that don't have an explicit def (legacy backward compat)
    const defs = { ...cache.tagDefs };
    for (const tag of Object.values(cache.folderTags)) {
      if (!defs[tag]) defs[tag] = BUILTIN_COLORS[tag] ?? '#6b7280';
    }
    return defs;
  },

  getTagColor: (courseId, tagName) => {
    const defs = get()._cache[courseId]?.tagDefs ?? {};
    return defs[tagName] ?? BUILTIN_COLORS[tagName] ?? '#6b7280';
  },

  createTag: async (courseId, tagName, color) => {
    const row = await getOrCreate(courseId);
    if (row.tagDefs[tagName]) return;
    const c = color ?? BUILTIN_COLORS[tagName] ?? nextPaletteColor(Object.values(row.tagDefs));
    const tagDefs = { ...row.tagDefs, [tagName]: c };
    await db.courseProgress.put({ ...row, tagDefs });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], tagDefs } } }));
  },

  upsertTagDef: async (courseId, tagName, color) => {
    const row = await getOrCreate(courseId);
    const tagDefs = { ...row.tagDefs, [tagName]: color };
    await db.courseProgress.put({ ...row, tagDefs });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], tagDefs } } }));
  },

  renameTag: async (courseId, oldName, newName) => {
    if (!newName || oldName === newName) return;
    const row = await getOrCreate(courseId);
    const color = row.tagDefs[oldName] ?? BUILTIN_COLORS[oldName] ?? '#6b7280';
    const tagDefs = { ...row.tagDefs };
    delete tagDefs[oldName];
    tagDefs[newName] = color;
    const folderTags: Record<string, string> = {};
    for (const [fid, t] of Object.entries(row.folderTags)) {
      folderTags[fid] = t === oldName ? newName : t;
    }
    await db.courseProgress.put({ ...row, tagDefs, folderTags });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], tagDefs, folderTags } } }));
  },

  deleteTag: async (courseId, tagName) => {
    const row = await getOrCreate(courseId);
    const tagDefs = { ...row.tagDefs };
    delete tagDefs[tagName];
    const folderTags: Record<string, string> = {};
    for (const [fid, t] of Object.entries(row.folderTags)) {
      if (t !== tagName) folderTags[fid] = t;
    }
    await db.courseProgress.put({ ...row, tagDefs, folderTags });
    set(s => ({ _cache: { ...s._cache, [courseId]: { ...s._cache[courseId], tagDefs, folderTags } } }));
  },
}));
