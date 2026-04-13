import type { GifMood } from '@/types';

/**
 * Analyzes user messages and conversation context to detect appropriate GIF moments
 */

interface MoodDetectionResult {
  shouldSendGif: boolean;
  mood: GifMood | null;
  confidence: number; // 0-1
}

// Keyword patterns for mood detection
const moodPatterns: Record<GifMood, RegExp[]> = {
  greeting: [
    /^(hi|hello|hey|wassup|sup|yo|greetings|good morning|good afternoon|good evening)/i,
    /\b(what's up|whats up|how are you|how's it going)\b/i,
  ],
  celebration: [
    /\b(correct|got it|nailed it|yes!|yay|awesome|amazing|perfect)\b/i,
    /\b(i understand|i get it|makes sense|that's clear)\b/i,
    /\b(thank you|thanks|appreciate)\b/i,
  ],
  encouragement: [
    /\b(confused|don't understand|dont understand|struggling|difficult|hard)\b/i,
    /\b(help|stuck|lost|can't|cannot)\b/i,
    /\b(frustrated|giving up)\b/i,
  ],
  thinking: [
    /\b(let me think|thinking|hmm|uh|um)\b/i,
    /\b(complex|complicated|tricky)\b/i,
  ],
  confused: [
    /\b(what|why|how|huh|wait)\b/i,
    /\?{2,}/, // Multiple question marks
    /\b(i don't get|i dont get|unclear|confusing)\b/i,
  ],
  success: [
    /\b(solved|finished|completed|done|success)\b/i,
    /\b(passed|aced|nailed)\b/i,
  ],
  failure: [
    /\b(wrong|incorrect|failed|mistake|error)\b/i,
    /\b(didn't work|didnt work|not right)\b/i,
  ],
  explaining: [
    /\b(explain|show me|teach me|how does|how do)\b/i,
    /\b(what is|what are|tell me about)\b/i,
  ],
  excited: [
    /!{2,}/, // Multiple exclamation marks
    /\b(excited|pumped|ready|let's go|lets go)\b/i,
  ],
};

/**
 * Detect mood from user message
 */
export function detectMoodFromUserMessage(message: string): MoodDetectionResult {
  const lowerMessage = message.toLowerCase().trim();

  // Check each mood pattern
  for (const [mood, patterns] of Object.entries(moodPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          shouldSendGif: true,
          mood: mood as GifMood,
          confidence: 0.8,
        };
      }
    }
  }

  // Default: no GIF
  return {
    shouldSendGif: false,
    mood: null,
    confidence: 0,
  };
}

/**
 * Detect mood from AI response context
 * Used when AI is responding to determine appropriate GIF
 */
export function detectMoodFromContext(
  userMessage: string,
  aiResponse: string,
  isFirstMessage: boolean
): MoodDetectionResult {
  // First message in conversation -> greeting
  if (isFirstMessage) {
    return {
      shouldSendGif: true,
      mood: 'greeting',
      confidence: 1.0,
    };
  }

  // Check user message for context
  const userMood = detectMoodFromUserMessage(userMessage);
  
  // If user is confused/struggling -> encouragement
  if (userMood.mood === 'confused' || userMood.mood === 'encouragement') {
    return {
      shouldSendGif: true,
      mood: 'encouragement',
      confidence: 0.9,
    };
  }

  // If user got something right -> celebration
  if (userMood.mood === 'celebration' || userMood.mood === 'success') {
    return {
      shouldSendGif: true,
      mood: 'celebration',
      confidence: 0.9,
    };
  }

  // If AI is explaining something complex -> explaining
  const aiLower = aiResponse.toLowerCase();
  if (
    aiLower.includes('let me explain') ||
    aiLower.includes('here\'s how') ||
    aiLower.includes('the key is') ||
    aiResponse.length > 500 // Long explanation
  ) {
    return {
      shouldSendGif: true,
      mood: 'explaining',
      confidence: 0.6,
    };
  }

  // If user is greeting -> greeting
  if (userMood.mood === 'greeting') {
    return {
      shouldSendGif: true,
      mood: 'greeting',
      confidence: 0.9,
    };
  }

  // Default: thinking (low confidence)
  return {
    shouldSendGif: true,
    mood: 'thinking',
    confidence: 0.3,
  };
}

/**
 * Parse GIF metadata from AI response (for deep mode)
 * AI can include GIF instructions in JSON format
 */
export function parseGifFromAIResponse(response: string): MoodDetectionResult {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*"gif"[\s\S]*\}/);
    if (!jsonMatch) {
      return { shouldSendGif: false, mood: null, confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.gif && parsed.gif.shouldSend && parsed.gif.mood) {
      return {
        shouldSendGif: true,
        mood: parsed.gif.mood as GifMood,
        confidence: 1.0,
      };
    }
  } catch (error) {
    // JSON parsing failed, fall back to context detection
    console.debug('Failed to parse GIF metadata from AI response:', error);
  }

  return { shouldSendGif: false, mood: null, confidence: 0 };
}
