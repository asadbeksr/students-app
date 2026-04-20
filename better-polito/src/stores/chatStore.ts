import { create } from 'zustand';
import { db } from '@/lib/db';
import type { ChatMessage, ChatStreamingState, ChatAttachment } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getClaudeClient } from '@/lib/claude';
import { getSystemPrompt, type ExplanationModes } from '@/lib/prompts';
import { formatAttachmentsForClaude } from '@/lib/claudeVision';
import { generateImageThumbnail } from '@/lib/fileProcessing';
import { useMaterialStore } from './materialStore';
import { extractPdfText } from '@/lib/pdfTextExtraction';
import { giphyService } from '@/lib/giphyService';
import { detectMoodFromContext } from '@/lib/moodDetection';
import { shouldShowGif } from '@/lib/gifPersonalities';

interface ChatStore {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  streamingState: ChatStreamingState;

  // Actions
  fetchMessages: (courseId: string) => Promise<void>;
  sendMessage: (courseId: string, content: string, files?: File[]) => Promise<void>;
  retryMessage: (courseId: string, messageId: string) => Promise<void>;
  clearMessages: (courseId: string) => Promise<void>;
  resetStreamingState: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  streamingState: {
    isThinking: false,
    thinkingContent: '',
    isStreaming: false,
    streamingContent: '',
    streamingMessageId: null,
  },

  fetchMessages: async (courseId) => {
    set({ loading: true, error: null });
    try {
      const messages = await db.chatMessages
        .where('courseId')
        .equals(courseId)
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

  sendMessage: async (courseId, content, files) => {
    set({ loading: true, error: null });
    
    try {
      // Validate input
      if (!content.trim() && (!files || files.length === 0)) {
        throw new Error('Please enter a message or attach a file');
      }

      // Create user message
      const userMessageId = uuidv4();
      
      // Process attachments if any
      const attachments: ChatAttachment[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            // Create material in Uploads folder
            const material = await useMaterialStore.getState().createMaterialFromAttachment(
              courseId,
              file
            );
            
            // Generate thumbnail for images
            let thumbnailData: string | undefined;
            if (file.type.startsWith('image/')) {
              try {
                thumbnailData = await generateImageThumbnail(file);
              } catch (error) {
                console.error('Failed to generate thumbnail for', file.name, error);
                // Continue without thumbnail
              }
            }
            
            // Read file data
            const fileData = await file.arrayBuffer();
            
            // Extract text from PDFs using pdf.js (FREE)
            // Clone the ArrayBuffer before extraction to prevent detachment
            let extractedText: string | undefined;
            let useVisionApi = false;
            if (file.type === 'application/pdf') {
              try {
                // Clone the ArrayBuffer so the original doesn't get detached
                const clonedData = fileData.slice(0);
                const result = await extractPdfText(clonedData);
                if (!result.isLikelyScanned && result.text.length > 0) {
                  // Successfully extracted text - use it
                  extractedText = result.text;
                } else {
                  // Scanned PDF or no text - could use Vision API
                  // For now, we'll set a flag but not automatically use Vision API
                  // The user can choose to enable this in the UI
                  useVisionApi = false;
                  extractedText = `[This PDF appears to be scanned or image-based. ${result.pageCount} page(s). Enable Vision API to extract content.]`;
                }
              } catch (error) {
                console.error('Failed to extract PDF text for', file.name, error);
                extractedText = `[Failed to extract text from PDF: ${(error as Error).message}]`;
              }
            }
            
            // Create attachment record
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
              useVisionApi,
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
        role: 'user',
        content,
        attachments,
        timestamp: new Date().toISOString(),
      };
      
      await db.chatMessages.add(userMessage);
      await get().fetchMessages(courseId);
      
      // Get course and materials for context
      // In Polito Community, courses come from the PoliTO API (not local DB),
      // so we create a minimal stub if the course isn't stored locally.
      let course = await db.courses.get(courseId);
      if (!course) {
        const now = new Date().toISOString();
        course = {
          id: courseId,
          name: `Course ${courseId}`,
          subject: 'Other' as any,
          examDate: now,
          knowledgeLevel: 'intermediate' as any,
          createdAt: now,
          updatedAt: now,
          studyPlan: null,
          progress: {
            completedMaterials: [],
            totalMaterials: 0,
            completionPercentage: 0,
            totalStudyTimeSeconds: 0,
          },
        };
        // Persist stub so subsequent calls reuse it
        await db.courses.put(course);
      }
      
      const materials = await db.materials.where('courseId').equals(courseId).toArray();
      
      // Get previous messages for context
      const previousMessages = await db.chatMessages
        .where('courseId')
        .equals(courseId)
        .sortBy('timestamp');
      
      // Prepare conversation history
      const conversationHistory = previousMessages
        .slice(-6) // Last 3 exchanges
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.role === 'user' ? msg.content : JSON.stringify(msg.explanationModes),
        }));
      
      // Get personality settings
      const settings = await db.settings.get('settings');
      const personality = settings?.aiPersonality || 'broski';
      const intensity = settings?.personalityIntensity || 'c';
      const explanationMode = settings?.explanationMode || 'deep';
      const visualModeEnabled = settings?.visualMode?.enabled ?? true;
      
      // Call Claude API with streaming
      const client = await getClaudeClient();
      const hasAttachments = attachments.length > 0;
      const systemPrompt = getSystemPrompt(course, materials, personality, intensity, explanationMode, hasAttachments, visualModeEnabled);
      
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
      
      // Prepare user message content (with attachments if any)
      let userContent;
      try {
        userContent = hasAttachments
          ? await formatAttachmentsForClaude(content, attachments)
          : content;
      } catch (formatError) {
        throw new Error(`Failed to format attachments: ${(formatError as Error).message}`);
      }
      
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: 'user', content: userContent },
        ],
      });
      
      let fullResponseText = '';
      
      // Simple text streaming
      stream.on('text', (text) => {
        fullResponseText += text;
        set(state => ({
          streamingState: {
            ...state.streamingState,
            isThinking: false,
            isStreaming: true,
            streamingContent: fullResponseText,
          },
        }));
      });
      
      const finalMessage = await stream.finalMessage();
      
      // Get final text if not captured via streaming
      if (!fullResponseText && finalMessage.content[0].type === 'text') {
        fullResponseText = finalMessage.content[0].text;
      }
      
      // Parse JSON response
      let explanationModes: ExplanationModes;
      try {
        explanationModes = JSON.parse(fullResponseText);
      } catch {
        // Fallback if not valid JSON
        explanationModes = {
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
      }
      
      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        courseId,
        role: 'assistant',
        content: fullResponseText,
        explanationModes: {
          intuitive: JSON.stringify(explanationModes.intuitive),
          structured: JSON.stringify(explanationModes.structured),
          formal: JSON.stringify(explanationModes.formal),
        },
        referencedMaterials: explanationModes.referencedMaterials.map(ref => ({
          materialId: materials.find(m => m.name === ref.materialName)?.id || '',
          materialName: ref.materialName,
        })),
        timestamp: new Date().toISOString(),
      };
      
      // Fetch GIF if enabled
      const gifsEnabled = settings?.gifsEnabled ?? true;
      if (gifsEnabled && shouldShowGif(personality, intensity)) {
        try {
          // Detect mood from conversation context
          const isFirstMessage = previousMessages.length <= 1; // Only user message exists
          const moodResult = detectMoodFromContext(
            content,
            fullResponseText,
            isFirstMessage
          );
          
          if (moodResult.shouldSendGif && moodResult.mood) {
            // Fetch GIF from service
            const gif = await (giphyService as any).getGif(
              moodResult.mood,
              personality,
              intensity
            );
            
            if (gif) {
              assistantMessage.gifUrl = gif.url;
              assistantMessage.gifPreviewUrl = gif.previewUrl;
              assistantMessage.gifMood = moodResult.mood;
            }
          }
        } catch (gifError) {
          // Don't fail the message if GIF fetch fails
          console.error('Failed to fetch GIF:', gifError);
        }
      }
      
      await db.chatMessages.add(assistantMessage);
      await get().fetchMessages(courseId);
      
      // Reset streaming state
      get().resetStreamingState();
      set({ loading: false });
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      let userFriendlyError = `Failed to send message: ${errorMessage}`;
      
      if (errorMessage === 'API_KEY_MISSING') {
        userFriendlyError = 'Please add your Claude API key in Settings';
      } else if (errorMessage.includes('quota')) {
        userFriendlyError = 'API quota exceeded. Please check your Claude API usage.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyError = 'Network error. Please check your internet connection.';
      } else if (errorMessage.includes('attachment') || errorMessage.includes('file')) {
        userFriendlyError = errorMessage; // Already formatted for files
      }
      
      set({ 
        error: userFriendlyError,
        loading: false 
      });
      get().resetStreamingState();
    }
  },

  retryMessage: async (courseId, messageId) => {
    try {
      // Find the assistant message and the user message before it
      const messages = await db.chatMessages
        .where('courseId')
        .equals(courseId)
        .sortBy('timestamp');
      
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1 || messageIndex === 0) return;
      
      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== 'user') return;
      
      // Delete the assistant message
      await db.chatMessages.delete(messageId);
      await get().fetchMessages(courseId);
      
      // Resend the user's message
      await get().sendMessage(courseId, userMessage.content);
    } catch (error) {
      set({ error: `Failed to retry message: ${(error as Error).message}` });
    }
  },

  clearMessages: async (courseId) => {
    await db.chatMessages.where('courseId').equals(courseId).delete();
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
