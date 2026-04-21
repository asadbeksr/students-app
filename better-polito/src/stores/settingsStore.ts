import { create } from 'zustand';
import { db } from '@/lib/db';
import type { AppSettings } from '@/types';
import { giphyService } from '@/lib/giphyService';

interface SettingsStore {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
  setAiModel: (model: 'gemini-pro-latest' | 'gemini-flash-latest') => Promise<void>;
  setCustomSystemPrompt: (prompt: string | null) => Promise<void>;
  setLanguage: (language: 'en' | 'it') => Promise<void>;
  setAiPersonality: (personality: 'broski' | 'bestie' | 'professor') => Promise<void>;
  setPersonalityIntensity: (intensity: 'a' | 'b' | 'c') => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      let settings = await db.settings.get('settings');

      // Initialize if not exists
      if (!settings) {
        settings = {
          id: 'settings',
          aiModel: 'gemini-flash-latest',
          customSystemPrompt: null,
          language: 'en',
          lastBackupAt: null,
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
        };
        await db.settings.add(settings);
      }

      // Migrate existing settings without personality fields
      if (!settings.aiPersonality) {
        settings.aiPersonality = 'broski';
        settings.personalityIntensity = 'c';
        await db.settings.update('settings', {
          aiPersonality: 'broski',
          personalityIntensity: 'c',
        });
      }

      // Migrate existing settings without theme field
      if (!settings.theme) {
        settings.theme = 'light';
        await db.settings.update('settings', { theme: 'light' });
      }

      // Migrate existing settings without GIF fields
      if (settings.gifsEnabled === undefined) {
        settings.gifsEnabled = true;
        settings.giphyApiKey = null;
        await db.settings.update('settings', {
          gifsEnabled: true,
          giphyApiKey: null,
        });
      }

      // Migrate existing settings without Visual Mode
      if (!settings.visualMode) {
        settings.visualMode = {
          enabled: true,
          animationsEnabled: true,
          autoExpandBlocks: true,
          preferredBlockSize: 'normal',
        };
        await db.settings.update('settings', {
          visualMode: settings.visualMode
        });
      }

      // Migrate existing settings without AI model
      if (!settings.aiModel) {
        settings.aiModel = 'gemini-flash-latest';
        settings.customSystemPrompt = null;
        await db.settings.update('settings', {
          aiModel: 'gemini-flash-latest',
          customSystemPrompt: null,
        });
      }

      // Initialize Giphy service with env variable or user setting
      const giphyApiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || process.env.VITE_GIPHY_API_KEY || settings.giphyApiKey;
      if (giphyApiKey && giphyApiKey !== 'your_api_key_here') {
        giphyService.initialize(giphyApiKey);
      }

      set({ settings, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateSettings: async (updates) => {
    try {
      await db.settings.update('settings', updates);
      await get().fetchSettings();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setAiModel: async (model) => {
    await get().updateSettings({ aiModel: model });
  },

  setCustomSystemPrompt: async (prompt) => {
    await get().updateSettings({ customSystemPrompt: prompt });
  },

  setLanguage: async (language) => {
    await get().updateSettings({ language });
  },

  setAiPersonality: async (personality) => {
    await get().updateSettings({ aiPersonality: personality });
  },

  setPersonalityIntensity: async (intensity) => {
    await get().updateSettings({ personalityIntensity: intensity });
  },

  setTheme: async (theme) => {
    await get().updateSettings({ theme });
  },
}));
