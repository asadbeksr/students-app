import Dexie, { Table } from 'dexie';
import type {
  Course,
  Folder,
  Material,
  ChatMessage,
  ChatAttachment,
  MockExam,
  ExamAttempt,
  AppSettings,
  PageCache,
  GifCacheEntry,
} from '@/types';

class StudyBuddyDB extends Dexie {
  courses!: Table<Course>;
  folders!: Table<Folder>;
  materials!: Table<Material>;
  chatMessages!: Table<ChatMessage>;
  chatAttachments!: Table<ChatAttachment>;
  mockExams!: Table<MockExam>;
  examAttempts!: Table<ExamAttempt>;
  settings!: Table<AppSettings>;
  pageCache!: Table<PageCache>;
  gifCache!: Table<GifCacheEntry>;

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
  }

  async initializeSettings() {
    const existing = await this.settings.get('settings');
    if (!existing) {
      await this.settings.add({
        id: 'settings',
        claudeApiKey: null,
        language: 'en',
        lastBackupAt: null,
        explanationMode: 'deep',
        aiPersonality: 'broski',
        personalityIntensity: 'c',
        theme: 'light',
        gifsEnabled: true,
        giphyApiKey: null,
        visualMode: {
          enabled: true,
          animationsEnabled: true,
          autoExpandBlocks: true,
          preferredBlockSize: 'normal',
        },
      });
    }

  }
}

export const db = new StudyBuddyDB();

// Initialize settings on first load
db.initializeSettings().catch(console.error);
