import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';

let client: Anthropic | null = null;

/**
 * Gets the Claude API key from:
 * 1. Environment variable (VITE_CLAUDE_API_KEY) - PREFERRED
 * 2. Settings page (stored in IndexedDB) - FALLBACK
 */
async function getApiKey(): Promise<string> {
  // Try environment variable first (more secure)
  const envKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
  if (envKey && envKey !== 'your_api_key_here') {
    return envKey;
  }
  
  // Fallback to settings (less secure, but convenient for users)
  const settings = await db.settings.get('settings');
  if (settings?.claudeApiKey) {
    return settings.claudeApiKey;
  }
  
  throw new Error('API_KEY_MISSING');
}

export async function getClaudeClient(): Promise<Anthropic> {
  if (client) return client;
  
  const apiKey = await getApiKey();
  
  client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
  
  return client;
}

export function resetClaudeClient() {
  client = null;
}
