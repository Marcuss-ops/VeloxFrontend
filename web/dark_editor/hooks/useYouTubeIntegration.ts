import { useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { uploadImage } from '@/lib/api';
import { youtubeApi } from '@/lib/youtubeApi';
import { groupsApi } from '@/lib/youtube';
import type { YouTubeGroup, YouTubeVideo } from '@/lib/youtube/types';

export interface YouTubeUploadResult {
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export interface UseYouTubeIntegrationReturn {
  youtubeChannels: Array<{ id: string; name: string; title?: string; thumbnail?: string }>;
  selectedChannel: string;
  setSelectedChannel: (id: string) => void;
  loadingChannels: boolean;
  youtubeGroups: YouTubeGroup[];
  selectedYouTubeGroup: string;
  setSelectedYouTubeGroup: (name: string) => void;
  privateVideos: YouTubeVideo[];
  loadingPrivateVideos: boolean;
  selectedVideoIds: string[];
  setSelectedVideoIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  publishAfterUpload: boolean;
  setPublishAfterUpload: (value: boolean) => void;
  youtubeUploadResults: Record<string, YouTubeUploadResult>;
  youtubeUploadComplete: boolean;
  isUploadingToYouTube: boolean;
  sortedVideos: YouTubeVideo[];
  refresh: () => void;
  processYouTubeUpload: (blob: Blob, filename: string) => Promise<boolean>;
}

export function useYouTubeIntegration(): UseYouTubeIntegrationReturn {
  const { currentProject } = useProjectStore();
  const { addToast } = useUIStore();

  const [youtubeChannels, setYoutubeChannels] = useState<
    Array<{ id: string; name: string; title?: string; thumbnail?: string }>
  >([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loadingChannels, setLoadingChannels] = useState(false);

  const [youtubeGroups, setYoutubeGroups] = useState<YouTubeGroup[]>([]);
  const [selectedYouTubeGroup, setSelectedYouTubeGroup] = useState<string>('');
  const [privateVideos, setPrivateVideos] = useState<YouTubeVideo[]>([]);
  const [loadingPrivateVideos, setLoadingPrivateVideos] = useState(false);

  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [publishAfterUpload, setPublishAfterUpload] = useState(true);
  const [youtubeUploadResults, setYoutubeUploadResults] = useState<
    Record<string, YouTubeUploadResult>
  >({});
  const [youtubeUploadComplete, setYoutubeUploadComplete] = useState(false);
  const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);

  const sortedVideos = [...privateVideos].sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });

  const loadYouTubeChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch(`/dark_editor_v2/api/v1/youtube/channels?validate_tokens=false`);
      if (!res.ok) throw new Error('API error');
      const response = await res.json();
      const channels = response.channels || [];
      setYoutubeChannels(channels);
      if (channels.length > 0 && !selectedChannel) {
        setSelectedChannel(channels[0].id);
      }
    } catch (error) {
      console.error('Failed to load YouTube channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadYouTubeGroupsAndVideos = async () => {
    try {
      const groups = await groupsApi.listGroups();
      setYoutubeGroups(groups);
      if (groups.length > 0) {
        const matched = groups.find((g) =>
          currentProject?.name?.toLowerCase().includes(g.name.toLowerCase())
        );
        const initialGroup = matched ? matched.name : groups[0].name;
        setSelectedYouTubeGroup(initialGroup);
      }
    } catch (error) {
      console.error('Failed to load YouTube groups:', error);
    }
  };

  useEffect(() => {
    if (!selectedYouTubeGroup) {
      setPrivateVideos([]);
      return;
    }
    setLoadingPrivateVideos(true);
    groupsApi
      .getGroupPrivateVideos(selectedYouTubeGroup)
      .then((res) => {
        setPrivateVideos(res?.videos || []);
      })
      .catch((err) => {
        console.error('Failed to load private videos:', err);
        setPrivateVideos([]);
      })
      .finally(() => {
        setLoadingPrivateVideos(false);
      });
  }, [selectedYouTubeGroup]);

  const refresh = useCallback(() => {
    void loadYouTubeChannels();
    void loadYouTubeGroupsAndVideos();
    setSelectedVideoIds([]);
    setYoutubeUploadResults({});
    setYoutubeUploadComplete(false);
  }, []);

  const processYouTubeUpload = useCallback(
    async (blob: Blob, filename: string) => {
      if (selectedVideoIds.length === 0) {
        return false;
      }

      setIsUploadingToYouTube(true);
      try {
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        const uploadRes = await uploadImage(file);
        const serverFilename = uploadRes.filename;

        const results: Record<string, YouTubeUploadResult> = {};
        for (const vidId of selectedVideoIds) {
          const video = privateVideos.find((v) => v.video_id === vidId);
          if (!video || !video.channel_id) continue;

          results[vidId] = { status: 'pending' };
          setYoutubeUploadResults({ ...results });

          try {
            const resTh = (await youtubeApi.setThumbnail(vidId, video.channel_id, serverFilename)) as {
              ok?: boolean;
              error?: string;
            };
            if (!resTh?.ok) throw new Error(resTh?.error || 'Failed to apply thumbnail');

            if (publishAfterUpload) {
              const resPub = (await youtubeApi.updateMetadata(vidId, video.channel_id, {
                privacy: 'public',
              })) as { ok?: boolean; error?: string };
              if (!resPub?.ok) throw new Error(resPub?.error || 'Failed to publish video');
            }

            results[vidId] = { status: 'success' };
          } catch (e: any) {
            console.error(`Failed to process video ${vidId}:`, e);
            results[vidId] = { status: 'error', message: e.message || 'Operation failed' };
          }
          setYoutubeUploadResults({ ...results });
        }

        const success = Object.values(results).some((r) => r.status === 'success');
        setYoutubeUploadComplete(true);
        return success;
      } catch (err: any) {
        console.error('YouTube processing failed:', err);
        addToast({ type: 'error', message: `YouTube task failed: ${err.message || err}` });
        return false;
      } finally {
        setIsUploadingToYouTube(false);
      }
    },
    [addToast, privateVideos, publishAfterUpload, selectedVideoIds]
  );

  return {
    youtubeChannels,
    selectedChannel,
    setSelectedChannel,
    loadingChannels,
    youtubeGroups,
    selectedYouTubeGroup,
    setSelectedYouTubeGroup,
    privateVideos,
    loadingPrivateVideos,
    selectedVideoIds,
    setSelectedVideoIds,
    publishAfterUpload,
    setPublishAfterUpload,
    youtubeUploadResults,
    youtubeUploadComplete,
    isUploadingToYouTube,
    sortedVideos,
    refresh,
    processYouTubeUpload,
  };
}
