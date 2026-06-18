/**
 * Channel Configuration Store
 * 
 * Centralized persistence for YouTube channel configuration.
 * Abstracts storage backend (localStorage now, API later).
 * 
 * The UI should never directly access localStorage.
 * Use this store for all channel config operations.
 */

import { detectLanguage, type LanguageCode } from '@/features/youtube/languageDetection';

// Types
export interface ChannelConfig {
  id: string;
  name: string;
  title?: string;
  language: LanguageCode;
  group: string;
}

export interface GroupsConfig {
  [groupName: string]: {
    color?: string;
    channels: ChannelConfig[];
  };
}

/**
 * Storage adapter interface
 */
export interface ChannelConfigStore {
  /** Save configuration */
  save: (config: GroupsConfig) => Promise<void>;
  /** Load configuration */
  load: () => Promise<GroupsConfig>;
  /** Clear configuration */
  clear: () => Promise<void>;
}

const STORAGE_KEY = 'youtube_channels_config';

/**
 * LocalStorage implementation (current)
 */
class LocalStorageChannelStore implements ChannelConfigStore {
    async save(config: GroupsConfig): Promise<void> {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config, null, 2));
      } catch (error) {
        console.error('[ChannelConfigStore] Failed to save config:', error);
        const wrappedError = new Error('Failed to save channel configuration');
        (wrappedError as Error & { cause?: unknown }).cause = error;
        throw wrappedError;
      }
    }

  async load(): Promise<GroupsConfig> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[ChannelConfigStore] Failed to load config:', error);
      // Return empty config on corruption
    }
    return {};
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Create a channel config with auto-detected language
 */
export function createChannelConfig(
  id: string,
  name: string,
  title?: string,
  group: string = 'Undefined'
): ChannelConfig {
  return {
    id,
    name,
    title,
    language: detectLanguage(name, title),
    group,
  };
}

/**
 * Merge server channel data with local config
 * Preserves user-assigned groups and languages where possible
 */
export function mergeChannelConfig(
  liveChannels: Array<{ id: string; name: string; title?: string }>,
  existingConfig: GroupsConfig
): GroupsConfig {
  const merged: GroupsConfig = {};
  
  // Initialize groups from existing config
  Object.entries(existingConfig).forEach(([groupName, groupData]) => {
    merged[groupName] = {
      color: groupData.color,
      channels: [],
    };
  });

  // Ensure Undefined group exists
  if (!merged['Undefined']) {
    merged['Undefined'] = { channels: [] };
  }

  // Track which channels we've seen
  const seenChannelIds = new Set<string>();

  // Merge existing channels
  Object.entries(existingConfig).forEach(([groupName, groupData]) => {
    groupData.channels.forEach((channel) => {
      seenChannelIds.add(channel.id);
      
      // Check if channel still exists in live data
      const liveChannel = liveChannels.find(lc => lc.id === channel.id);
      if (liveChannel) {
        merged[groupName].channels.push({
          ...channel,
          name: liveChannel.name || channel.name,
          title: liveChannel.title || channel.title,
        });
      }
    });
  });

  // Add new channels to Undefined group
  liveChannels.forEach((liveChannel) => {
    if (!seenChannelIds.has(liveChannel.id)) {
      merged['Undefined'].channels.push(
        createChannelConfig(
          liveChannel.id,
          liveChannel.name,
          liveChannel.title,
          'Undefined'
        )
      );
    }
  });

  return merged;
}

// Singleton instance
const localStorageStore = new LocalStorageChannelStore();

/**
 * Default store instance
 * Replace this with API store when backend is ready
 */
export const channelConfigStore: ChannelConfigStore = localStorageStore;

/**
 * Hook-friendly wrapper
 */
export function useChannelConfig() {
  return {
    save: (config: GroupsConfig) => channelConfigStore.save(config),
    load: () => channelConfigStore.load(),
    clear: () => channelConfigStore.clear(),
    create: createChannelConfig,
    merge: (liveChannels: Array<{ id: string; name: string; title?: string }>, config: GroupsConfig) =>
      mergeChannelConfig(liveChannels, config),
  };
}
