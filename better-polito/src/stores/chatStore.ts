import { create } from 'zustand';
import { db } from '@/lib/db';
import type { ChatMessage, ChatStreamingState, ChatAttachment, Conversation, GeneratedImage, GeneratedVideoData, Course } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getSystemPrompt } from '@/lib/prompts';
import { generateImageThumbnail } from '@/lib/fileProcessing';
import { arrayBufferToBase64 } from '@/lib/fileProcessing';
import { useMaterialStore } from './materialStore';
import { useCoursePortalStore } from '@/lib/stores/coursePortalStore';
import { waitForDocument, type OpenDocumentPayload } from '@/lib/openDocument';
import { extractPdfText } from '@/lib/pdfTextExtraction';
import { giphyService } from '@/lib/giphyService';
import { detectMoodFromContext } from '@/lib/moodDetection';
import { shouldShowGif } from '@/lib/gifPersonalities';

/**
 * Generate a short conversation title from the first user message. Best-effort:
 * returns the cleaned title, or null on any failure so callers keep "New Chat".
 */
async function generateTitleFromMessage(content: string): Promise<string | null> {
  try {
    const res = await fetch('/api/ai/course-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        systemPrompt: 'Generate a very short title (max 5 words) for this chat conversation based on the user message. Reply with ONLY the title, nothing else. No quotes, no punctuation at the end.',
        model: 'gemini-flash-latest',
      }),
    });
    if (!res.ok) return null;

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let title = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      title += decoder.decode(value, { stream: true });
    }
    // Clean up AI output: strip quotes/bold markers, trim, cap length.
    title = title.replace(/^["*]+|["*]+$/g, '').trim().slice(0, 50);
    return title || null;
  } catch {
    return null;
  }
}

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
        subject: 'General',
        examDate: new Date().toISOString(),
        knowledgeLevel: 'intermediate',
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
        .slice(-20) // Last 20 messages (~10 exchanges)
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

      // Get settings
      const settings = await db.settings.get('settings');
      const visualModeEnabled = settings?.visualMode?.enabled ?? true;
      const manimModeEnabled = settings?.manimMode ?? false;
      const aiModel = settings?.aiModel || 'gemini-flash-latest';
      const imageGenerationEnabled = settings?.imageGeneration ?? false;
      const videoGenerationEnabled = settings?.videoGeneration ?? false;
      const customSystemPrompt = settings?.customSystemPrompt || null;

      // Build system prompt
      const hasAttachments = attachments.length > 0;

      // Get the currently open document from coursePortalStore. Extraction is
      // triggered + awaited here (bounded), so the AI is never sent a request
      // blind to a document that is open on screen.
      let openDocumentName: string | null = null;
      let openDocumentPage: number | null = null;
      let openDocument: OpenDocumentPayload | undefined;
      try {
        const portalState = useCoursePortalStore.getState().getCourseState(courseId);
        openDocumentPage = portalState.previewPage ?? null;
        if (portalState.preview) {
          openDocumentName = portalState.preview.name;
          const content = await waitForDocument(portalState.preview, 20000);
          openDocument = {
            name: portalState.preview.name,
            url: portalState.preview.url,
            pageCount: content.pageCount,
            currentPage: openDocumentPage,
            isScanned: content.isScanned,
            status: content.status,
            fullText: content.status === 'ready' ? content.text : undefined,
          };
        }
      } catch {}

      const systemPrompt = getSystemPrompt(
        course as unknown as Course, materials,
        hasAttachments, visualModeEnabled, manimModeEnabled, customSystemPrompt,
        openDocumentName, studentContext || null,
        openDocumentPage
      );

      const assistantMessageId = uuidv4();

      // ============ VIDEO GENERATION MODE ============
      if (videoGenerationEnabled) {
        set({
          streamingState: {
            isThinking: true,
            thinkingContent: '',
            isStreaming: false,
            streamingContent: '',
            streamingMessageId: assistantMessageId,
          },
        });

        try {
          const response = await fetch('/api/ai/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: content,
              aspectRatio: settings?.videoAspectRatio || '16:9',
              duration: settings?.videoDuration || 8,
              resolution: settings?.videoResolution || '720p',
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Video generation failed: ${response.status}`);
          }

          // Parse SSE stream for progress + result
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let videoResult: GeneratedVideoData | null = null;
          let errorMsg: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.status === 'error') {
                  errorMsg = data.error;
                } else if (data.status === 'complete' && data.video) {
                  videoResult = {
                    data: data.video.data,
                    uri: data.video.uri,
                    mimeType: data.video.mimeType || 'video/mp4',
                  };
                } else if (data.message) {
                  set(state => ({
                    streamingState: {
                      ...state.streamingState,
                      thinkingContent: data.message,
                    },
                  }));
                }
              } catch { /* skip malformed SSE lines */ }
            }
          }

          if (errorMsg) throw new Error(errorMsg);
          if (!videoResult) throw new Error('No video was generated.');

          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            courseId,
            conversationId,
            role: 'assistant',
            content: '',
            generatedVideos: [videoResult],
            timestamp: new Date().toISOString(),
          };

          await db.chatMessages.add(assistantMessage);
          await get().fetchMessages(conversationId);
          get().resetStreamingState();
          set({ loading: false });

          // Auto-name conversation
          const now = new Date().toISOString();
          await db.conversations.update(conversationId, { updatedAt: now });
          const conv = await db.conversations.get(conversationId);
          if (conv && conv.title === 'New Chat') {
            const title = await generateTitleFromMessage(content);
            if (title) await get().renameConversation(conversationId, title);
          }

          await get().fetchConversations(courseId);
          return;
        } catch (error) {
          const errorMessage = (error as Error).message;
          set({ error: `Video generation failed: ${errorMessage}`, loading: false });
          get().resetStreamingState();
          return;
        }
      }

      // ============ IMAGE GENERATION MODE ============
      if (imageGenerationEnabled) {
        // Initialize streaming state for image gen
        set({
          streamingState: {
            isThinking: true,
            thinkingContent: '',
            isStreaming: false,
            streamingContent: '',
            streamingMessageId: assistantMessageId,
          },
        });

        try {
          // Serialize image attachments for the image generation API
          const imageAttachments = attachments
            .filter(att => att.fileType.startsWith('image/'))
            .map(att => ({
              base64Data: arrayBufferToBase64(att.fileData),
              mimeType: att.fileType,
              fileName: att.fileName,
            }));

          const response = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: content,
              conversationHistory: conversationHistory.slice(0, -1),
              attachments: imageAttachments.length > 0 ? imageAttachments : undefined,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Image generation failed: ${response.status}`);
          }

          const result = await response.json();
          const generatedImages: GeneratedImage[] = result.images || [];
          const responseText = result.text || (generatedImages.length > 0 ? '' : 'No image was generated.');

          // Show generated text in streaming state briefly
          if (responseText) {
            set(state => ({
              streamingState: {
                ...state.streamingState,
                isThinking: false,
                isStreaming: true,
                streamingContent: responseText,
              },
            }));
          }

          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            courseId,
            conversationId,
            role: 'assistant',
            content: responseText,
            generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
            timestamp: new Date().toISOString(),
          };

          await db.chatMessages.add(assistantMessage);
          await get().fetchMessages(conversationId);
          get().resetStreamingState();
          set({ loading: false });

          // Update conversation timestamp and auto-name
          const now = new Date().toISOString();
          await db.conversations.update(conversationId, { updatedAt: now });

          const conv = await db.conversations.get(conversationId);
          if (conv && conv.title === 'New Chat') {
            const title = await generateTitleFromMessage(content);
            if (title) await get().renameConversation(conversationId, title);
          }

          await get().fetchConversations(courseId);
          return;
        } catch (error) {
          const errorMessage = (error as Error).message;
          set({ error: `Image generation failed: ${errorMessage}`, loading: false });
          get().resetStreamingState();
          return;
        }
      }

      // ============ NORMAL CHAT MODE ============

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
      const serializedAttachments = attachments.length > 0
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
          openDocument,
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

        let currentThinking = '';
        let currentContent = '';

        if (fullResponseText.startsWith('<think>')) {
           const endIdx = fullResponseText.indexOf('</think>');
           if (endIdx !== -1) {
              currentThinking = fullResponseText.substring(7, endIdx).trim();
              currentContent = fullResponseText.substring(endIdx + 8).trimStart();
           } else {
              currentThinking = fullResponseText.substring(7);
              currentContent = '';
           }
        } else {
           currentContent = fullResponseText;
        }

        set(state => ({
          streamingState: {
            ...state.streamingState,
            isThinking: currentThinking.length > 0 && currentContent.length === 0,
            thinkingContent: currentThinking,
            isStreaming: currentContent.length > 0,
            streamingContent: currentContent,
          },
        }));
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        courseId,
        conversationId,
        role: 'assistant',
        content: fullResponseText,
        timestamp: new Date().toISOString(),
      };

      // Fetch GIF if enabled
      const gifsEnabled = settings?.gifsEnabled ?? true;
      if (gifsEnabled && shouldShowGif('professor', 'a')) {
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

      // Reset streaming state immediately so we don't show duplicate messages during title generation
      get().resetStreamingState();
      set({ loading: false });

      // Update conversation timestamp and auto-name if it's the first message
      const conv = await db.conversations.get(conversationId);
      const now = new Date().toISOString();
      await db.conversations.update(conversationId, { updatedAt: now });

      if (conv && conv.title === 'New Chat') {
        // Auto-name the conversation based on the first user message
        const title = await generateTitleFromMessage(content);
        if (title) await get().renameConversation(conversationId, title);
      }

      await get().fetchConversations(courseId);

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
