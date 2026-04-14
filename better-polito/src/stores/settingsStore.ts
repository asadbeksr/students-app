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
  setApiKey: (apiKey: string) => Promise<void>;
  setLanguage: (language: 'en' | 'it') => Promise<void>;
  setExplanationMode: (mode: 'quick' | 'deep') => Promise<void>;
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
          claudeApiKey: null,
          language: 'en',
          lastBackupAt: null,
          explanationMode: 'deep',
          aiPersonality: 'broski',
          personalityIntensity: 'c',
          theme: 'light',
          gifsEnabled: true,
          giphyApiKey: null,
        };
        await db.settings.add(settings);
      }
      
      // Migrate existing settings without explanationMode
      if (!settings.explanationMode) {
        settings.explanationMode = 'deep';
        await db.settings.update('settings', { explanationMode: 'deep' });
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

  setApiKey: async (apiKey) => {
    await get().updateSettings({ claudeApiKey: apiKey });
  },

  setLanguage: async (language) => {
    await get().updateSettings({ language });
  },

  setExplanationMode: async (mode) => {
    await get().updateSettings({ explanationMode: mode });
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
