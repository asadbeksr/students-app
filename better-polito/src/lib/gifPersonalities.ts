import type { GifMood } from '@/types';

/**
 * Maps personality + mood combinations to Giphy search queries
 * Each personality has distinct GIF preferences to match their character
 */

type PersonalityType = 'broski' | 'bestie' | 'professor';

interface PersonalityGifMap {
  [key: string]: {
    [mood in GifMood]: string[];
  };
}

export const personalityGifQueries: PersonalityGifMap = {
  broski: {
    greeting: ['fist bump', 'what\'s up bro', 'bro handshake', 'hey man'],
    celebration: ['epic celebration', 'hype', 'fire reaction', 'let\'s go', 'awesome'],
    encouragement: ['you got this bro', 'no worries man', 'keep going', 'stay strong'],
    thinking: ['thinking hard', 'brain working', 'hmm thinking', 'processing'],
    confused: ['confused bro', 'wait what', 'huh'],
    success: ['victory', 'winning', 'champion', 'yes'],
    failure: ['it\'s okay bro', 'we\'ll get it', 'no problem', 'try again'],
    explaining: ['teaching', 'explaining', 'showing how'],
    excited: ['pumped up', 'excited bro', 'hyped'],
  },
  bestie: {
    greeting: ['hey girl', 'bestie wave', 'excited greeting', 'hi bestie'],
    celebration: ['you did it girl', 'proud of you', 'yasss queen', 'girl power', 'amazing'],
    encouragement: ['you can do it bestie', 'I believe in you', 'supportive hug', 'you got this girl'],
    thinking: ['hmm thinking', 'pondering cute', 'thinking girl'],
    confused: ['confused girl', 'wait what girl', 'huh girl'],
    success: ['happy dance', 'excited celebration', 'omg yes', 'yay'],
    failure: ['it\'s okay girl', 'supportive bestie', 'don\'t worry', 'we\'ll figure it out'],
    explaining: ['teaching girl', 'explaining bestie', 'showing you'],
    excited: ['so excited', 'omg excited', 'happy girl'],
  },
  professor: {
    greeting: ['professional greeting', 'teacher wave', 'hello class'],
    celebration: ['well done', 'excellent work', 'good job', 'academic success'],
    encouragement: ['keep studying', 'you\'re learning', 'practice makes perfect'],
    thinking: ['professor thinking', 'academic', 'scholarly'],
    confused: ['hmm interesting', 'let me explain'],
    success: ['academic success', 'excellent', 'well done student'],
    failure: ['learning process', 'try again', 'study more'],
    explaining: ['professor teaching', 'lecture', 'academic explanation'],
    excited: ['enthusiastic teacher', 'excited professor'],
  },
};

/**
 * Get GIF frequency multiplier based on personality intensity
 * Returns probability (0-1) that a GIF should be shown
 */
export function getGifFrequency(
  personality: PersonalityType,
  intensity: 'a' | 'b' | 'c'
): number {
  const baseFrequencies = {
    a: 0.2,  // Rare - only major moments
    b: 0.5,  // Moderate - balanced approach
    c: 0.8,  // Frequent - maximum expression
  };

  let frequency = baseFrequencies[intensity];

  // Professor personality has 50% reduction on all intensity levels
  if (personality === 'professor') {
    frequency *= 0.5;
  }

  return frequency;
}

/**
 * Get a random search query for a given personality and mood
 */
export function getGifSearchQuery(
  personality: PersonalityType,
  mood: GifMood
): string {
  const queries = personalityGifQueries[personality][mood];
  return queries[Math.floor(Math.random() * queries.length)];
}

/**
 * Determine if a GIF should be shown based on personality and intensity
 */
export function shouldShowGif(
  personality: PersonalityType,
  intensity: 'a' | 'b' | 'c'
): boolean {
  const frequency = getGifFrequency(personality, intensity);
  return Math.random() < frequency;
}
