import Dexie, { Table } from 'dexie';
import type {
  Course,
  Folder,
  Material,
  ChatMessage,
  ChatAttachment,
  Conversation,
  AppSettings,
  PageCache,
  GifCacheEntry,
} from '@/types';
import type { AttemptConfig } from '@/types/exam';
import type { Attempt } from './exam/attempt';

export interface CourseProgress {
  courseId: string;
  completedFileIds: string[];
  folderTags: Record<string, string>; // folderId -> tag name
  tagDefs?: Record<string, string>;   // tag name -> hex color
}

// Active (in-progress) mock-exam attempt, one row per subject+mode.
export interface ActiveExamAttempt {
  id: string; // `${subject}:${mode}`
  attempt: Attempt;
}

// A submitted mock-exam attempt, archived for review. The full attempt is
// stored so a past attempt can be replayed; list summaries are derived on read.
export interface ArchivedExamAttempt {
  id: string;      // String(attempt.startedAt)
  subject: string;
  mode: string;
  startedAt: number;
  attempt: Attempt;
}

// Saved mock-exam config (filters/scoring) per subject+mode.
export interface SavedExamConfig {
  id: string; // `${subject}:${mode}`
  config: Partial<AttemptConfig>;
}

class StudyBuddyDB extends Dexie {
  courses!: Table<Course>;
  folders!: Table<Folder>;
  materials!: Table<Material>;
  chatMessages!: Table<ChatMessage>;
  chatAttachments!: Table<ChatAttachment>;
  conversations!: Table<Conversation>;
  settings!: Table<AppSettings>;
  pageCache!: Table<PageCache>;
  gifCache!: Table<GifCacheEntry>;
  courseProgress!: Table<CourseProgress>;
  examAttempts!: Table<ActiveExamAttempt>;
  examHistory!: Table<ArchivedExamAttempt>;
  examConfigs!: Table<SavedExamConfig>;

  constructor() {
    super('StudyBuddyDB');
    this.version(1).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
    });
    
    // Version 2: Add pageCache table for PDF LaTeX extraction caching
    this.version(2).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
    });
    
    // Version 3: Add AI personality settings
    this.version(3).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
    }).upgrade(async tx => {
      // Add default personality settings to existing settings record
      const settings = await tx.table('settings').get('settings');
      if (settings) {
        await tx.table('settings').update('settings', {
          aiPersonality: 'broski',
          personalityIntensity: 'c',
        });
      }
    });
    
    // Version 4: Add chat attachments
    this.version(4).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      chatAttachments: 'id, messageId, materialId',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
    });
    
    // Version 5: Add GIF cache and settings
    this.version(5).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      chatAttachments: 'id, messageId, materialId',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
      gifCache: 'id, giphyId, mood, personality, cachedAt',
    }).upgrade(async tx => {
      // Add GIF settings to existing settings record
      const settings = await tx.table('settings').get('settings');
      if (settings) {
        await tx.table('settings').update('settings', {
          gifsEnabled: true,
          giphyApiKey: null,
        });
      }
    });

    // Version 6: Add Visual Mode settings
    this.version(6).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      chatAttachments: 'id, messageId, materialId',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
      gifCache: 'id, giphyId, mood, personality, cachedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').get('settings');
      if (settings) {
        await tx.table('settings').update('settings', {
          visualMode: {
            enabled: true,
            animationsEnabled: true,
            autoExpandBlocks: true,
            preferredBlockSize: 'normal',
          },
        });
      }
    });

    // Version 7: Migrate to Gemini — remove claudeApiKey, add aiModel + customSystemPrompt
    this.version(7).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, timestamp',
      chatAttachments: 'id, messageId, materialId',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
      gifCache: 'id, giphyId, mood, personality, cachedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').get('settings');
      if (settings) {
        const update: Record<string, unknown> = {
          aiModel: 'gemini-flash-latest',
          customSystemPrompt: null,
        };
        // Remove old Claude key
        if ('claudeApiKey' in settings) {
          delete (settings as Record<string, unknown>).claudeApiKey;
          update.claudeApiKey = undefined;
        }
        await tx.table('settings').update('settings', update);
      }
    });

    // Version 8: Add conversations table, add conversationId to chatMessages
    this.version(8).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, conversationId, timestamp',
      chatAttachments: 'id, messageId, materialId',
      conversations: 'id, courseId, updatedAt',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
      gifCache: 'id, giphyId, mood, personality, cachedAt',
    }).upgrade(async tx => {
      // Migrate existing messages: create a default conversation per course
      // and assign all existing messages to it
      const messages = await tx.table('chatMessages').toArray();
      const courseIds = [...new Set(messages.map((m: { courseId?: string | number }) => m.courseId))];

      for (const cid of courseIds) {
        const convId = `legacy-${cid}`;
        const courseMessages = messages.filter((m: { courseId?: string | number }) => m.courseId === cid);
        const firstMsg = courseMessages[0];
        const lastMsg = courseMessages[courseMessages.length - 1];

        // Create a conversation for this course's existing messages
        await tx.table('conversations').add({
          id: convId,
          courseId: cid,
          title: 'Previous Chat',
          createdAt: firstMsg?.timestamp || new Date().toISOString(),
          updatedAt: lastMsg?.timestamp || new Date().toISOString(),
        });

        // Update all messages with the conversationId
        for (const msg of courseMessages) {
          await tx.table('chatMessages').update(msg.id, { conversationId: convId });
        }
      }
    });

    // Version 9: Add courseProgress table for per-file completion and folder tags
    this.version(9).stores({
      courses: 'id, subject, examDate',
      folders: 'id, courseId, parentId',
      materials: 'id, courseId, folderId, type',
      chatMessages: 'id, courseId, conversationId, timestamp',
      chatAttachments: 'id, messageId, materialId',
      conversations: 'id, courseId, updatedAt',
      mockExams: 'id, courseId',
      examAttempts: 'id, examId, courseId',
      settings: 'id',
      pageCache: 'id, materialId, pageNumber',
      gifCache: 'id, giphyId, mood, personality, cachedAt',
      courseProgress: 'courseId',
    }).upgrade(async tx => {
      // Migrate existing localStorage progress data if present
      try {
        const raw = localStorage.getItem('better-polito:progress');
        if (raw) {
          const parsed = JSON.parse(raw);
          const state = parsed?.state ?? parsed;
          const completedFiles: Record<string, string[]> = state?.completedFiles ?? {};
          const folderTags: Record<string, Record<string, 'lecture' | 'practice'>> = state?.folderTags ?? {};
          const courseIds = new Set([...Object.keys(completedFiles), ...Object.keys(folderTags)]);
          for (const courseId of courseIds) {
            await tx.table('courseProgress').put({
              courseId,
              completedFileIds: completedFiles[courseId] ?? [],
              folderTags: folderTags[courseId] ?? {},
            });
          }
          localStorage.removeItem('better-polito:progress');
        }
      } catch { /* ignore migration errors */ }
    });

    // Version 10: Drop the legacy AI mock-exam tables (different feature, now
    // removed). Setting them to null deletes the old object stores and their
    // data, clearing the way for the new exam-practice stores in version 11.
    this.version(10).stores({
      mockExams: null,
      examAttempts: null,
    });

    // Version 11: Persist the exam-practice flow (lib/exam/*) in IndexedDB
    // instead of localStorage, which was hitting quota on large attempts.
    //   examAttempts — active in-progress attempt, keyed `${subject}:${mode}`
    //   examHistory  — archived submitted attempts, queried by [subject+mode]
    //   examConfigs  — saved filter/scoring config, keyed `${subject}:${mode}`
    this.version(11).stores({
      examAttempts: 'id',
      examHistory: 'id, [subject+mode], startedAt',
      examConfigs: 'id',
    });
  }

}

let _db: StudyBuddyDB | null = null;

function getDB(): StudyBuddyDB {
  if (!_db) {
    if (typeof window === 'undefined') {
      throw new Error('Dexie (IndexedDB) is not available on the server.');
    }
    _db = new StudyBuddyDB();
  }
  return _db;
}

export const db: StudyBuddyDB = new Proxy({} as StudyBuddyDB, {
  get(_target, prop, receiver) {
    const instance = getDB();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
