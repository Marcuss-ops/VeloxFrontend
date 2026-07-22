/**
 * useChannelLanguages - React hook for managing YouTube destination language
 * associations through the InstaEdit social destinations API.
 *
 * The legacy `/api/v1/channels` endpoints have been removed. A "channel"
 * is now represented by a connected YouTube social destination (managed by
 * InstaEdit). The destination's default language is stored in the
 * `defaults.language` field of the SocialDestination record and can be
 * updated via `socialDestinationsApi.update`.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { socialDestinationsApi, type SocialDestination } from '@/lib/api/socialDestinationsApi';
import { authApi } from '@/lib/api/authApi';

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

/** A YouTube destination with its persisted default language. */
export interface ChannelLanguage {
  external_destination_id: string;
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
  youtubeDestinations: SocialDestination[];

  // Actions
  fetchChannelLanguage: (externalDestinationId: string) => Promise<ChannelLanguage | null>;
  setChannelLanguage: (externalDestinationId: string, channelName: string, languageCode: string) => Promise<boolean>;
  autoDetectLanguage: (externalDestinationId: string, channelName: string) => Promise<ChannelLanguage | null>;
  batchProcessChannels: (items: Array<{ external_destination_id?: string; label?: string; name?: string }>) => Promise<ChannelLanguage[]>;
  detectFromName: (channelName: string) => Promise<{code: string; name: string; flag: string} | null>;
  refresh: () => Promise<void>;

  // Utilities
  getFlag: (langCode: string) => string;
  getLanguageName: (langCode: string) => string;
}

/**
 * Hook for managing YouTube destination language associations.
 */
export function useChannelLanguages(): UseChannelLanguagesResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeDestinations, setYoutubeDestinations] = useState<SocialDestination[]>([]);
  const destinationsRef = useRef<SocialDestination[]>([]);

  const getFlag = useCallback((langCode: string): string => {
    return LANGUAGE_FLAGS[langCode] || '🌐';
  }, []);

  const getLanguageName = useCallback((langCode: string): string => {
    return LANGUAGE_NAMES[langCode] || 'Unknown';
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await authApi.getMe();
      if (!me?.workspaceId) {
        setError('Not authenticated');
        setYoutubeDestinations([]);
        return;
      }
      const response = await socialDestinationsApi.list(me.workspaceId);
      const youtubeOnly = (response.destinations ?? []).filter((d) => d.provider === 'youtube' || d.source_system === 'youtube');
      setYoutubeDestinations(youtubeOnly);
      destinationsRef.current = youtubeOnly;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load YouTube destinations';
      setError(message);
      setYoutubeDestinations([]);
      destinationsRef.current = [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fetchChannelLanguage = useCallback(async (externalDestinationId: string): Promise<ChannelLanguage | null> => {
    try {
      const destination = destinationsRef.current.find((d) => d.external_destination_id === externalDestinationId)
        ?? youtubeDestinations.find((d) => d.external_destination_id === externalDestinationId);
      if (!destination) return null;
      const langCode = String(destination.defaults?.language || 'en');
      return {
        external_destination_id: destination.external_destination_id,
        channel_name: destination.label || `Destination ${destination.external_destination_id}`,
        language_code: langCode,
        language_name: getLanguageName(langCode),
        flag: getFlag(langCode),
        auto_detected: false,
      };
    } catch (e) {
      console.error('[ChannelLanguages] Error fetching destination language:', e);
      return null;
    }
  }, [youtubeDestinations, getFlag, getLanguageName]);

  const setChannelLanguage = useCallback(async (
    externalDestinationId: string,
    _channelName: string,
    languageCode: string
  ): Promise<boolean> => {
    try {
      const current = await socialDestinationsApi.get(externalDestinationId);
      await socialDestinationsApi.update(externalDestinationId, {
        defaults: { ...current.defaults, language: languageCode },
      });
      return true;
    } catch (e) {
      console.error('[ChannelLanguages] Error setting destination language:', e);
      return false;
    }
  }, []);

  const detectFromName = useCallback(async (
    channelName: string
  ): Promise<{code: string; name: string; flag: string} | null> => {
    try {
      // Simple client-side language detection from the destination label.
      const lower = (channelName || '').toLowerCase();
      let best: { code: string; name: string; flag: string } | null = null;
      let bestScore = 0;
      for (const lang of LANGUAGES) {
        const matches = lower.match(new RegExp(lang.name.toLowerCase(), 'g'));
        const score = matches ? matches.length : 0;
        if (score > bestScore) {
          bestScore = score;
          best = { code: lang.code, name: lang.name, flag: lang.flag };
        }
      }
      if (best) return best;
      return { code: 'en', name: 'English', flag: '🇬🇧' };
    } catch (e) {
      console.error('[ChannelLanguages] Error detecting from name:', e);
      return null;
    }
  }, []);

  const autoDetectLanguage = useCallback(async (
    externalDestinationId: string,
    channelName: string
  ): Promise<ChannelLanguage | null> => {
    const detected = await detectFromName(channelName);
    if (!detected) return null;
    const ok = await setChannelLanguage(externalDestinationId, channelName, detected.code);
    if (!ok) return null;
    return {
      external_destination_id: externalDestinationId,
      channel_name: channelName,
      language_code: detected.code,
      language_name: detected.name,
      flag: detected.flag,
      auto_detected: true,
    };
  }, [detectFromName, setChannelLanguage]);

  const batchProcessChannels = useCallback(async (
    items: Array<{ external_destination_id?: string; label?: string; name?: string }>
  ): Promise<ChannelLanguage[]> => {
    setLoading(true);
    setError(null);
    try {
      const result: ChannelLanguage[] = [];
      for (const item of items) {
        const externalDestinationId = item.external_destination_id;
        if (!externalDestinationId) continue;
        const destination = youtubeDestinations.find((d) => d.external_destination_id === externalDestinationId);
        const label = item.label || item.name || destination?.label || externalDestinationId;
        const detected = await detectFromName(label);
        const langCode = detected?.code || String(destination?.defaults?.language || 'en');
        result.push({
          external_destination_id: externalDestinationId,
          channel_name: label,
          language_code: langCode,
          language_name: getLanguageName(langCode),
          flag: getFlag(langCode),
          auto_detected: !!detected,
        });
      }
      return result;
    } catch (e) {
      console.error('[ChannelLanguages] Error batch processing:', e);
      setError('Failed to process destinations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [youtubeDestinations, getFlag, getLanguageName, detectFromName]);

  return {
    loading,
    error,
    youtubeDestinations,
    fetchChannelLanguage,
    setChannelLanguage,
    autoDetectLanguage,
    batchProcessChannels,
    detectFromName,
    refresh,
    getFlag,
    getLanguageName,
  };
}

export default useChannelLanguages;
