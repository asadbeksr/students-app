// Core type definitions for StudyBuddy

export interface Course {
  id: string;
  name: string;
  subject: 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology' | 'Computer Science' |'Italian' | 'Other';
  examDate: string;
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
  updatedAt: string;
  studyPlan: StudyPlan | null;
  progress: {
    completedMaterials: string[];
    totalMaterials: number;
    completionPercentage: number;
    totalStudyTimeSeconds: number;
  };
}

export interface Folder {
  id: string;
  courseId: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
}

export interface Material {
  id: string;
  courseId: string;
  folderId: string | null;
  type: 'pdf' | 'note';
  name: string;
  // PDF fields
  fileName?: string;
  fileData?: ArrayBuffer;
  fileSize?: number;
  totalPages?: number;
  // Note fields
  content?: string;
  // AI-extracted
  extractedText?: string;
  topics?: string[];
  formulas?: string[];
  // Progress
  isCompleted: boolean;
  pagesRead?: number;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatAttachment {
  id: string;
  messageId: string;
  materialId: string; // References material in Uploads folder
  fileName: string;
  fileType: string; // MIME type
  fileSize: number;
  fileData: ArrayBuffer; // Actual file content
  thumbnailData?: string; // Base64 thumbnail for images
  extractedText?: string; // Extracted text for PDFs (using pdf.js)
  useVisionApi?: boolean; // Whether to use Claude Vision API for this PDF
  createdAt: string;
}

export interface Conversation {
  id: string;
  courseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  courseId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  explanationModes?: {
    intuitive: string;
    structured: string;
    formal: string;
  };
  referencedMaterials?: {
    materialId: string;
    materialName: string;
  }[];
  gifUrl?: string;
  gifMood?: string;
  gifPreviewUrl?: string;
  timestamp: string;
}

export interface MockExam {
  id: string;
  courseId: string;
  name: string;
  duration: number; // minutes
  questions: MCQQuestion[];
  createdAt: string;
}

export interface MCQQuestion {
  id: string;
  questionText: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceMaterialId?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  courseId: string;
  startedAt: string;
  completedAt: string | null;
  timeSpentSeconds: number;
  answers: {
    questionId: string;
    selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
    isCorrect: boolean;
    timeTakenSeconds: number;
  }[];
  score: number;
  totalQuestions: number;
  analytics: {
    scorePercentage: number;
    topicBreakdown: {
      topic: string;
      correct: number;
      total: number;
      strength: 'strong' | 'moderate' | 'weak';
    }[];
    weakAreas: {
      topic: string;
      recommendedMaterials: {
        materialId: string;
        materialName: string;
      }[];
    }[];
  };
}

export interface StudyPlan {
  id: string;
  courseId: string;
  generatedAt: string;
  examDate: string;
  totalDays: number;
  totalHours: number;
  hoursPerDay: number;
  weeks: {
    weekNumber: number;
    startDate: string;
    endDate: string;
    topics: {
      id: string;
      name: string;
      allocatedHours: number;
      materials: string[];
      isCompleted: boolean;
    }[];
    isReviewWeek: boolean;
  }[];
}

export interface AppSettings {
  id: 'settings';
  aiModel: 'gemini-pro-latest' | 'gemini-flash-latest';
  customSystemPrompt: string | null;
  language: 'en' | 'it';
  lastBackupAt: string | null;
  aiPersonality: 'broski' | 'bestie' | 'professor';
  personalityIntensity: 'a' | 'b' | 'c';
  theme: 'light' | 'dark';
  gifsEnabled: boolean;
  giphyApiKey: string | null;
  visualMode?: VisualModeSettings;
}

export interface VisualModeSettings {
  enabled: boolean;
  animationsEnabled: boolean;
  autoExpandBlocks: boolean;
  preferredBlockSize: 'compact' | 'normal' | 'expanded';
}

export interface BackupData {
  version: '1.0';
  exportedAt: string;
  data: {
    courses: Course[];
    folders: Folder[];
    materials: Material[]; // fileData as base64
    chatMessages: ChatMessage[];
    mockExams: MockExam[];
    examAttempts: ExamAttempt[];
    settings: AppSettings;
  };
}

export interface PageCache {
  id: string;           // `${materialId}-${pageNumber}`
  materialId: string;
  pageNumber: number;
  latexContent: string;
  extractedAt: string;
}

export interface ChatStreamingState {
  isThinking: boolean;
  thinkingContent: string;
  isStreaming: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
}

// GIF Feature Types
export interface GifData {
  id: string;
  url: string;
  width: number;
  height: number;
  previewUrl: string; // smaller version for faster loading
  title: string;
}

export type GifMood = 
  | 'celebration' 
  | 'encouragement' 
  | 'thinking' 
  | 'confused' 
  | 'greeting' 
  | 'success' 
  | 'failure'
  | 'explaining'
  | 'excited';

export interface GifSearchParams {
  mood: GifMood;
  personality: 'broski' | 'bestie' | 'professor';
  intensity: 'a' | 'b' | 'c';
}

export interface GifCacheEntry {
  id: string;
  giphyId: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  mood: string;
  personality: string;
  searchQuery: string;
  cachedAt: string;
  usageCount: number;
}

