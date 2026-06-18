/**
 * useYouTubeChannelSelection Hook
 * 
 * Manages YouTube channel loading, grouping, and selection.
 * Extracted from DriveImporter to separate channel logic from UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { youtubeApi } from '@/lib/api';

// Types
export interface ChannelOption {
  id: string;
  name: string;
  thumbnail?: string;
}

export interface ChannelGroupOption {
  id: string;
  name: string;
  channels: ChannelOption[];
}

export interface UseYouTubeChannelSelectionReturn {
  /** All available channels */
  channels: ChannelOption[];
  /** Channel groups */
  channelGroups: ChannelGroupOption[];
  /** Currently selected group ID */
  selectedGroup: string | null;
  /** Selected channel IDs */
  selectedChannels: string[];
  /** Loading state */
  loading: boolean;
  
  // Actions
  /** Toggle channel selection */
  toggleChannel: (channelId: string) => void;
  /** Select all channels in a group */
  selectGroup: (groupId: string) => void;
  /** Clear channel selection */
  clearSelection: () => void;
  /** Set selected channels */
  setSelectedChannels: (channels: string[]) => void;
}

type ManagerGroupsResponse = {
  ok?: boolean;
  groups?: Record<string, {
    name?: string;
    channels?: Array<{
      id: string;
      title?: string;
      name?: string;
      thumbnail?: string;
    }>;
  }> | Array<{
    name?: string;
    channels?: Array<{
      id: string;
      title?: string;
      name?: string;
      thumbnail?: string;
    }>;
  }>;
};

const normalizeGroups = (groups: ManagerGroupsResponse['groups']): ChannelGroupOption[] => {
  if (!groups) return [];

  const entries = Array.isArray(groups)
    ? groups.map(group => [group.name || '', group] as const)
    : Object.entries(groups);

  return entries
    .filter(([groupName]) => Boolean(groupName))
    .map(([groupName, group]) => ({
      id: groupName,
      name: group.name || groupName,
      channels: (group.channels || []).map(ch => ({
        id: ch.id,
        name: ch.name || ch.title || ch.id,
        thumbnail: ch.thumbnail,
      })),
    }));
};

/**
 * Hook to manage YouTube channel selection
 */
export function useYouTubeChannelSelection(): UseYouTubeChannelSelectionReturn {
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [channelGroups, setChannelGroups] = useState<ChannelGroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load YouTube channels
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    youtubeApi.managerGroups()
      .then((res) => {
        if (cancelled) return;
        const groups = normalizeGroups((res as ManagerGroupsResponse).groups);
        const mapped = Array.from(
          new Map(groups.flatMap(group => group.channels).map(ch => [ch.id, ch])).values()
        );
        setChannels(mapped);
      })
      .catch((e) => {
        console.error('[useYouTubeChannelSelection] Failed to load channels:', e);
        setChannels([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    
    return () => { cancelled = true; };
  }, []);

  // Load channel groups
  useEffect(() => {
    let cancelled = false;
    
    youtubeApi.managerGroups()
      .then((res) => {
        if (cancelled) return;
        const groups = normalizeGroups((res as ManagerGroupsResponse).groups);
        
        const allChannels = groups.flatMap(g => g.channels);
        const uniqueChannels = Array.from(
          new Map(allChannels.map(ch => [ch.id, ch])).values()
        );
        
        groups.push({
          id: 'all',
          name: 'All channels',
          channels: uniqueChannels,
        });
        
        setChannelGroups(groups);
      })
      .catch((e) => {
        console.error('[useYouTubeChannelSelection] Failed to load channel groups:', e);
        setChannelGroups([]);
      });
    
    return () => { cancelled = true; };
  }, []);

  // Toggle channel selection
  const toggleChannel = useCallback((channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  }, []);

  // Select group
  const selectGroup = useCallback((groupId: string) => {
    setSelectedGroup(groupId);
    const group = channelGroups.find(g => g.id === groupId);
    if (group) {
      setSelectedChannels(group.channels.map(ch => ch.id));
    }
  }, [channelGroups]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedGroup(null);
    setSelectedChannels([]);
  }, []);

  return {
    channels,
    channelGroups,
    selectedGroup,
    selectedChannels,
    loading,
    toggleChannel,
    selectGroup,
    clearSelection,
    setSelectedChannels,
  };
}

export default useYouTubeChannelSelection;
