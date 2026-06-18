/**
 * useChannelLanguages - React hook for managing channel language associations.
 * Provides language detection, fetching, and updating capabilities.
 */

import { useState, useCallback } from 'react';

const API_BASE = '/api/v1/channels';

// Language definitions
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', ru: '🇷🇺', es: '🇪🇸', fr: '🇫🇷', it: '🇮🇹',
  de: '🇩🇪', pt: '🇵🇹', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
  ar: '🇸🇦', hi: '🇮🇳',
};

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ru: 'Russian', es: 'Spanish', fr: 'French', it: 'Italian',
  de: 'German', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', hi: 'Hindi',
};

export interface ChannelLanguage {
  channel_id: string;
  channel_name: string;
  language_code: string;
  language_name: string;
  flag: string;
  auto_detected: boolean;
}

export interface UseChannelLanguagesResult {
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchChannelLanguage: (channelId: string) => Promise<ChannelLanguage | null>;
  setChannelLanguage: (channelId: string, channelName: string, languageCode: string) => Promise<boolean>;
  autoDetectLanguage: (channelId: string, channelName: string) => Promise<ChannelLanguage | null>;
  batchProcessChannels: (channels: Array<{id?: string; channel_id?: string; channel?: string; name?: string; title?: string}>) => Promise<ChannelLanguage[]>;
  detectFromName: (channelName: string) => Promise<{code: string; name: string; flag: string} | null>;
  
  // Utilities
  getFlag: (langCode: string) => string;
  getLanguageName: (langCode: string) => string;
}

/**
 * Hook for managing channel language associations.
 */
export function useChannelLanguages(): UseChannelLanguagesResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFlag = useCallback((langCode: string): string => {
    return LANGUAGE_FLAGS[langCode] || '🌐';
  }, []);

  const getLanguageName = useCallback((langCode: string): string => {
    return LANGUAGE_NAMES[langCode] || 'Unknown';
  }, []);

  const fetchChannelLanguage = useCallback(async (channelId: string): Promise<ChannelLanguage | null> => {
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(channelId)}/language`);
      const data = await res.json();
      if (data.ok) {
        const channelLang: ChannelLanguage = {
          channel_id: data.channel_id,
          channel_name: data.channel_name,
          language_code: data.language_code,
          language_name: data.language_name,
          flag: data.flag,
          auto_detected: data.auto_detected,
        };
        return channelLang;
      }
      return null;
    } catch (e) {
      console.error('[ChannelLanguages] Error fetching channel language:', e);
      return null;
    }
  }, []);

  const setChannelLanguage = useCallback(async (
    channelId: string, 
    channelName: string, 
    languageCode: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(channelId)}/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          channel_name: channelName,
          language_code: languageCode,
        }),
      });
      const data = await res.json();
      return data.ok;
    } catch (e) {
      console.error('[ChannelLanguages] Error setting channel language:', e);
      return false;
    }
  }, []);

  const autoDetectLanguage = useCallback(async (
    channelId: string, 
    channelName: string
  ): Promise<ChannelLanguage | null> => {
    try {
      const res = await fetch(
        `${API_BASE}/${encodeURIComponent(channelId)}/language/auto-detect?channel_name=${encodeURIComponent(channelName)}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.ok) {
        return {
          channel_id: data.channel_id,
          channel_name: data.channel_name,
          language_code: data.language_code,
          language_name: data.language_name,
          flag: data.flag,
          auto_detected: data.auto_detected,
        } as ChannelLanguage;
      }
      return null;
    } catch (e) {
      console.error('[ChannelLanguages] Error auto-detecting language:', e);
      return null;
    }
  }, []);

  const batchProcessChannels = useCallback(async (
    channelList: Array<{id?: string; channel_id?: string; channel?: string; name?: string; title?: string}>
  ): Promise<ChannelLanguage[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/batch/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: channelList }),
      });
      const data = await res.json();
      if (data.ok && data.channels) {
        const processed = data.channels.map((ch: any) => ({
          channel_id: ch.channel_id || ch.id || ch.channel,
          channel_name: ch.channel_name || ch.name || ch.title || ch.channel_id,
          language_code: ch.language_code,
          language_name: ch.language_name,
          flag: ch.language_flag || LANGUAGE_FLAGS[ch.language_code] || '🌐',
          auto_detected: ch.auto_detected,
        }));
        
        return processed;
      }
      return [];
    } catch (e) {
      console.error('[ChannelLanguages] Error batch processing:', e);
      setError('Failed to process channels');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const detectFromName = useCallback(async (
    channelName: string
  ): Promise<{code: string; name: string; flag: string} | null> => {
    try {
      const res = await fetch(`${API_BASE}/detect?channel_name=${encodeURIComponent(channelName)}`);
      const data = await res.json();
      if (data.ok && data.detected_language) {
        return {
          code: data.detected_language.code,
          name: data.detected_language.name,
          flag: data.detected_language.flag,
        };
      }
      return null;
    } catch (e) {
      console.error('[ChannelLanguages] Error detecting from name:', e);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    fetchChannelLanguage,
    setChannelLanguage,
    autoDetectLanguage,
    batchProcessChannels,
    detectFromName,
    getFlag,
    getLanguageName,
  };
}

export default useChannelLanguages;