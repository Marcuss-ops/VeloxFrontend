import { useState, useEffect, useCallback } from 'react';
import { youtubeApi } from '../../../lib/api';

export type YTView = 'home' | 'channels';

export interface UseYouTubeManagerAppReturn {
  currentView: YTView;
  setCurrentView: (view: YTView) => void;
  addChannelModalOpen: boolean;
  setAddChannelModalOpen: (open: boolean) => void;
  addChannelTargetGroup: string | null;
  setAddChannelTargetGroup: (group: string | null) => void;
  refreshKey: number;
  handleAddChannel: (group: string, channelId: string, url: string, title: string, thumbnail?: string) => Promise<void>;
}

export const useYouTubeManagerApp = (): UseYouTubeManagerAppReturn => {
  const [currentView, setCurrentView] = useState<YTView>(() => {
    const v = (window as any).__YT_INITIAL_VIEW;
    return v === 'channels' ? 'channels' : 'home';
  });
  const [addChannelModalOpen, setAddChannelModalOpen] = useState(false);
  const [addChannelTargetGroup, setAddChannelTargetGroup] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const originalSwitchView = (window as any).switchView;
    (window as any).switchView = (viewName: string) => {
      setCurrentView((viewName === 'channels' ? 'channels' : 'home') as YTView);
      if (originalSwitchView) originalSwitchView(viewName);
    };
    return () => {
      (window as any).switchView = originalSwitchView;
    };
  }, []);

  // Global function to open add channel modal
  useEffect(() => {
    (window as any).openQuickAddChannelModal = (groupName?: string | null, _url?: string, _title?: string, _thumbnail?: string) => {
      setAddChannelTargetGroup(groupName || null);
      setAddChannelModalOpen(true);
    };
    return () => {
      delete (window as any).openQuickAddChannelModal;
    };
  }, []);

  const handleAddChannel = useCallback(async (group: string, channelId: string, url: string, title: string, thumbnail?: string) => {
    try {
      await youtubeApi.addChannelToManagerGroup(group, channelId, {
        url: url,
        title: title,
        thumbnail: thumbnail
      });
      setRefreshKey(k => k + 1);
      window.dispatchEvent(new CustomEvent('velox-group-channels-updated'));
    } catch (e) {
      console.error('[YTManager] Failed to add channel:', e);
    }
  }, []);

  return {
    currentView,
    setCurrentView,
    addChannelModalOpen,
    setAddChannelModalOpen,
    addChannelTargetGroup,
    setAddChannelTargetGroup,
    refreshKey,
    handleAddChannel,
  };
};