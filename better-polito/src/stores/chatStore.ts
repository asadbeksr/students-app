import { create } from 'zustand';
import { db } from '@/lib/db';

// Extract a window of pages around `centerPage` from extracted PDF text
function extractPageWindow(fullText: string, centerPage: number, radius: number): string {
  const startPage = Math.max(1, centerPage - radius);
  const endPage = centerPage + radius;
  const pageRegex = /--- Page (\d+) ---/g;

  // Split into sections by page marker
  const sections: { page: number; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pageRegex.exec(fullText)) !== null) {
    sections.push({ page: parseInt(match[1], 10), start: match.index });
  }

  const inWindow = sections.filter(s => s.page >= startPage && s.page <= endPage);
  if (!inWindow.length) return fullText;

  const first = inWindow[0].start;
  const lastSection = inWindow[inWindow.length - 1];
  const nextIdx = sections.findIndex(s => s.page > lastSection.page);
  const end = nextIdx >= 0 ? sections[nextIdx].start : fullText.length;

  return `[Showing pages ${startPage}–${Math.min(endPage, lastSection.page)} of the document]\n\n` + fullText.slice(first, end).trim();
}
import type { ChatMessage, ChatStreamingState, ChatAttachment, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getSystemPrompt, type ExplanationModes } from '@/lib/prompts';
import { generateImageThumbnail } from '@/lib/fileProcessing';
import { arrayBufferToBase64 } from '@/lib/fileProcessing';
import { useMaterialStore } from './materialStore';
import { useCoursePortalStore, useDocumentContentStore } from '@/lib/stores/coursePortalStore';
import { extractPdfText } from '@/lib/pdfTextExtraction';
import { giphyService } from '@/lib/giphyService';
import { detectMoodFromContext } from '@/lib/moodDetection';
import { shouldShowGif } from '@/lib/gifPersonalities';

interface ChatStore {
  messages: ChatMessage[];
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  error: string | null;
  streamingState: ChatStreamingState;

  // Conversation actions
  fetchConversations: (courseId: string) => Promise<void>;
  createConversation: (courseId: string) => Promise<string>;
  switchConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string, courseId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;

  // Message actions
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (courseId: string, content: string, files?: File[], studentContext?: string, courseName?: string) => Promise<void>;
  retryMessage: (courseId: string, messageId: string, courseName?: string) => Promise<void>;
  clearMessages: (conversationId: string) => Promise<void>;
  resetStreamingState: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversations: [],
  activeConversationId: null,
  loading: false,
  error: null,
  streamingState: {
    isThinking: false,
    thinkingContent: '',
    isStreaming: false,
    streamingContent: '',
    streamingMessageId: null,
  },

  fetchConversations: async (courseId) => {
    try {
      const conversations = await db.conversations
        .where('courseId')
        .equals(courseId)
        .reverse()
        .sortBy('updatedAt');
      set({ conversations });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },

  createConversation: async (courseId) => {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: uuidv4(),
      courseId,
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
    };
    await db.conversations.add(conv);
    set({ activeConversationId: conv.id, messages: [] });
    await get().fetchConversations(courseId);
    return conv.id;
  },

  switchConversation: async (conversationId) => {
    set({ activeConversationId: conversationId });
    await get().fetchMessages(conversationId);
  },

  deleteConversation: async (conversationId, courseId) => {
    // Delete all messages in this conversation
    const messages = await db.chatMessages
      .where('conversationId')
      .equals(conversationId)
      .toArray();

    for (const msg of messages) {
      // Delete attachments
      await db.chatAttachments.where('messageId').equals(msg.id).delete();
    }
    await db.chatMessages.where('conversationId').equals(conversationId).delete();
    await db.conversations.delete(conversationId);

    // If we deleted the active conversation, switch to the latest one or clear
    if (get().activeConversationId === conversationId) {
      const remaining = await db.conversations
        .where('courseId')
        .equals(courseId)
        .reverse()
        .sortBy('updatedAt');

      if (remaining.length > 0) {
        set({ activeConversationId: remaining[0].id });
        await get().fetchMessages(remaining[0].id);
      } else {
        set({ activeConversationId: null, messages: [] });
      }
    }
    await get().fetchConversations(courseId);
  },

  renameConversation: async (conversationId, title) => {
    await db.conversations.update(conversationId, { title });
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, title } : c
      ),
    }));
  },

  fetchMessages: async (conversationId) => {
    set({ loading: true, error: null });
    try {
      const messages = await db.chatMessages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('timestamp');

      // Load attachments for each message
      for (const message of messages) {
        const attachments = await db.chatAttachments
          .where('messageId')
          .equals(message.id)
          .toArray();
        message.attachments = attachments;
      }

      set({ messages, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  sendMessage: async (courseId, content, files, studentContext, courseName) => {
    set({ loading: true, error: null });

    try {
      // Validate input
      if (!content.trim() && (!files || files.length === 0)) {
        throw new Error('Please enter a message or attach a file');
      }

      // Ensure we have an active conversation
      let conversationId = get().activeConversationId;
      if (!conversationId) {
        conversationId = await get().createConversation(courseId);
      }

      // Create user message
      const userMessageId = uuidv4();

      // Process attachments if any
      const attachments: ChatAttachment[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const material = await useMaterialStore.getState().createMaterialFromAttachment(
              courseId,
              file
            );

            let thumbnailData: string | undefined;
            if (file.type.startsWith('image/')) {
              try {
                thumbnailData = await generateImageThumbnail(file);
              } catch (error) {
                console.error('Failed to generate thumbnail for', file.name, error);
              }
            }

            const fileData = await file.arrayBuffer();

            let extractedText: string | undefined;
            if (file.type === 'application/pdf') {
              try {
                const clonedData = fileData.slice(0);
                const result = await extractPdfText(clonedData);
                if (!result.isLikelyScanned && result.text.length > 0) {
                  extractedText = result.text;
                } else {
                  extractedText = `[This PDF appears to be scanned or image-based. ${result.pageCount} page(s).]`;
                }
              } catch (error) {
                console.error('Failed to extract PDF text for', file.name, error);
                extractedText = `[Failed to extract text from PDF: ${(error as Error).message}]`;
              }
            }

            const attachment: ChatAttachment = {
              id: uuidv4(),
              messageId: userMessageId,
              materialId: material.id,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              fileData,
              thumbnailData,
              extractedText,
              createdAt: new Date().toISOString(),
            };

            attachments.push(attachment);
            await db.chatAttachments.add(attachment);
          } catch (fileError) {
            console.error('Failed to process attachment', file.name, fileError);
            throw new Error(`Failed to process file ${file.name}: ${(fileError as Error).message}`);
          }
        }
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: userMessageId,
        courseId,
        conversationId,
        role: 'user',
        content,
        attachments,
        timestamp: new Date().toISOString(),
      };

      await db.chatMessages.add(userMessage);
      await get().fetchMessages(conversationId);

      const course = {
        id: courseId,
        name: courseName || `Course ${courseId}`,
        subject: 'General' as any,
        examDate: new Date().toISOString(),
        knowledgeLevel: 'intermediate' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        studyPlan: null,
        progress: {
          completedMaterials: [],
          totalMaterials: 0,
          completionPercentage: 0,
          totalStudyTimeSeconds: 0,
        },
      };

      const materials = await db.materials.where('courseId').equals(courseId).toArray();

      // Get previous messages for context (from this conversation only)
      const previousMessages = await db.chatMessages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('timestamp');

      // Prepare conversation history
      const conversationHistory = previousMessages
        .slice(-20) // Last 10 exchanges
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

      // Get settings
      const settings = await db.settings.get('settings');
      const personality = settings?.aiPersonality || 'broski';
      const intensity = settings?.personalityIntensity || 'c';
      const visualModeEnabled = settings?.visualMode?.enabled ?? true;
      const aiModel = settings?.aiModel || 'gemini-flash-latest';
      const customSystemPrompt = settings?.customSystemPrompt || null;

      // Build system prompt
      const hasAttachments = attachments.length > 0;

      // Get the currently open document from coursePortalStore
      let openDocumentName: string | null = null;
      let openDocumentUrl: string | null = null;
      let openDocumentText: string | null = null;
      try {
        const portalState = useCoursePortalStore.getState().getCourseState(courseId);
        if (portalState.preview) {
          openDocumentName = portalState.preview.name;
          openDocumentUrl = portalState.preview.url;

          let cachedDoc = useDocumentContentStore.getState().getContent(portalState.preview.id);

          // If extraction is still running, wait up to 15s for it to complete
          if (cachedDoc?.extracting) {
            for (let i = 0; i < 30; i++) {
              await new Promise(r => setTimeout(r, 500));
              cachedDoc = useDocumentContentStore.getState().getContent(portalState.preview.id);
              if (!cachedDoc?.extracting) break;
            }
          }

          if (cachedDoc && cachedDoc.text) {
            const fullText = cachedDoc.text;
            const currentPage = portalState.previewPage;

            if (currentPage) {
              // Extract a window of pages around the current page for focused context
              openDocumentText = extractPageWindow(fullText, currentPage, 2);
            } else {
              openDocumentText = fullText;
            }

            // Cap at 12k chars
            if (openDocumentText && openDocumentText.length > 12000) {
              openDocumentText = openDocumentText.slice(0, 12000) + '\n\n[... document truncated for context ...]';
            }
          }
        }
      } catch {}

      const systemPrompt = getSystemPrompt(
        course, materials, personality, intensity,
        hasAttachments, visualModeEnabled, customSystemPrompt,
        openDocumentName, studentContext || null
      );

      const assistantMessageId = uuidv4();

      // Initialize streaming state
      set({
        streamingState: {
          isThinking: true,
          thinkingContent: '',
          isStreaming: false,
          streamingContent: '',
          streamingMessageId: assistantMessageId,
        },
      });

      // Serialize attachments for the API (convert ArrayBuffer to base64)
      const serializedAttachments = hasAttachments
        ? attachments.map(att => ({
            fileName: att.fileName,
            fileType: att.fileType,
            fileSize: att.fileSize,
            base64Data: arrayBufferToBase64(att.fileData),
            extractedText: att.extractedText,
          }))
        : undefined;

      // Call Gemini via server API route with streaming
      const response = await fetch('/api/ai/course-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          systemPrompt,
          model: aiModel,
          attachments: serializedAttachments,
          openDocumentUrl,
          openDocumentText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Stream the response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullResponseText += decoder.decode(value, { stream: true });
        set(state => ({
          streamingState: {
            ...state.streamingState,
            isThinking: false,
            isStreaming: true,
            streamingContent: fullResponseText,
          },
        }));
      }

      // Prepare default explanation modes layout with the response
      const explanationModes: ExplanationModes = {
        keyTakeaway: '',
        intuitive: {
          analogy: '',
          visualDescription: '',
          plainExplanation: fullResponseText,
          scientificTerm: '',
        },
        structured: {
          steps: [],
          commonMistakes: [],
          examRelevance: '',
        },
        formal: {
          definition: '',
          notation: '',
          conditions: [],
          relatedConcepts: [],
        },
        referencedMaterials: [],
      };

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        courseId,
        conversationId,
        role: 'assistant',
        content: fullResponseText,
        explanationModes: {
          intuitive: JSON.stringify(explanationModes.intuitive),
          structured: JSON.stringify(explanationModes.structured),
          formal: JSON.stringify(explanationModes.formal),
        },
        referencedMaterials: explanationModes.referencedMaterials?.map(ref => ({
          materialId: materials.find(m => m.name === ref.materialName)?.id || '',
          materialName: ref.materialName,
        })) || [],
        timestamp: new Date().toISOString(),
      };

      // Fetch GIF if enabled
      const gifsEnabled = settings?.gifsEnabled ?? true;
      if (gifsEnabled && shouldShowGif(personality, intensity)) {
        try {
          const isFirstMessage = previousMessages.length <= 1;
          const moodResult = detectMoodFromContext(
            content,
            fullResponseText,
            isFirstMessage
          );

          if (moodResult.shouldSendGif && moodResult.mood) {
            const gifUrl = await giphyService.getRandomGif(
              moodResult.mood
            );

            if (gifUrl) {
              assistantMessage.gifUrl = gifUrl;
              assistantMessage.gifPreviewUrl = gifUrl;
              assistantMessage.gifMood = moodResult.mood;
            }
          }
        } catch (gifError) {
          console.error('Failed to fetch GIF:', gifError);
        }
      }

      await db.chatMessages.add(assistantMessage);
      await get().fetchMessages(conversationId);

      // Update conversation timestamp and auto-name if it's the first message
      const conv = await db.conversations.get(conversationId);
      const now = new Date().toISOString();
      await db.conversations.update(conversationId, { updatedAt: now });

      if (conv && conv.title === 'New Chat') {
        // Auto-name the conversation based on the first user message
        try {
          const titleResponse = await fetch('/api/ai/course-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: content }],
              systemPrompt: 'Generate a very short title (max 5 words) for this chat conversation based on the user message. Reply with ONLY the title, nothing else. No quotes, no punctuation at the end.',
              model: 'gemini-flash-latest',
            }),
          });
          if (titleResponse.ok) {
            const titleReader = titleResponse.body!.getReader();
            const titleDecoder = new TextDecoder();
            let title = '';
            while (true) {
              const { done, value } = await titleReader.read();
              if (done) break;
              title += titleDecoder.decode(value, { stream: true });
            }
            // Clean up AI output: remove quotes, bold tags, and trim
            title = title.replace(/^["*]+|["*]+$/g, '').trim().slice(0, 50);
            if (title) {
              await get().renameConversation(conversationId, title);
            }
          }
        } catch {
          // Non-critical — keep "New Chat" as title
        }
      }

      await get().fetchConversations(courseId);

      // Reset streaming state
      get().resetStreamingState();
      set({ loading: false });

    } catch (error) {
      const errorMessage = (error as Error).message;
      let userFriendlyError = `Failed to send message: ${errorMessage}`;

      if (errorMessage.includes('GEMINI_API_KEY') || errorMessage.includes('API key')) {
        userFriendlyError = 'AI is not configured. Please contact the administrator.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        userFriendlyError = 'AI rate limit reached. Please try again in a moment.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        userFriendlyError = 'Network error. Please check your internet connection.';
      } else if (errorMessage.includes('attachment') || errorMessage.includes('file')) {
        userFriendlyError = errorMessage;
      }

      set({
        error: userFriendlyError,
        loading: false
      });
      get().resetStreamingState();
    }
  },

  retryMessage: async (courseId, messageId, courseName) => {
    try {
      const convId = get().activeConversationId;
      if (!convId) return;

      const messages = await db.chatMessages
        .where('conversationId')
        .equals(convId)
        .sortBy('timestamp');

      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1 || messageIndex === 0) return;

      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== 'user') return;

      await db.chatMessages.delete(messageId);
      await get().fetchMessages(convId);
      await get().sendMessage(courseId, userMessage.content, undefined, undefined, courseName);
    } catch (error) {
      set({ error: `Failed to retry message: ${(error as Error).message}` });
    }
  },

  clearMessages: async (conversationId) => {
    await db.chatMessages.where('conversationId').equals(conversationId).delete();
    set({ messages: [] });
  },

  resetStreamingState: () => {
    set({
      streamingState: {
        isThinking: false,
        thinkingContent: '',
        isStreaming: false,
        streamingContent: '',
        streamingMessageId: null,
      },
    });
  },
}));
