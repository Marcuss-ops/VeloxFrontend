'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_VIDEOS } from '@/lib/demo-data';
import { groupsApi } from '@/lib/youtube';
import type { GroupFeedPayload, GroupPrivateVideosResponse } from '@/lib/youtube/groups';
import type { YouTubeVideo } from '@/lib/youtube/types';

interface UseGroupVideosResult {
  videos: YouTubeVideo[];
  privateVideos: YouTubeVideo[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useGroupVideos(groupName: string | null): UseGroupVideosResult {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [privateVideos, setPrivateVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, YouTubeVideo[]>>(new Map());

  const fetchVideos = useCallback(async (name: string, refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [feedData, privateData] = await Promise.all([
        groupsApi.getGroupFeed(name),
        groupsApi.getGroupPrivateVideos(name, refresh, 90).catch(() => null),
      ]);

      const feedList: YouTubeVideo[] = Array.isArray(feedData) ? feedData : feedData?.videos ?? [];
      const privList: YouTubeVideo[] = privateData?.videos ?? [];

      cache.current.set(name, feedList);
      setVideos(feedList);
      setPrivateVideos(privList);
    } catch {
      const fallback = DEMO_VIDEOS[name] ?? [];
      cache.current.set(name, fallback);
      setVideos(fallback);
      setPrivateVideos([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!groupName) return;
    cache.current.delete(groupName);
    await fetchVideos(groupName, true);
  }, [fetchVideos, groupName]);

  useEffect(() => {
    if (!groupName) {
      setVideos([]);
      setPrivateVideos([]);
      return;
    }
    const cached = cache.current.get(groupName);
    if (cached) {
      setVideos(cached);
      void groupsApi.getGroupPrivateVideos(groupName, false, 90).then(r => setPrivateVideos(r?.videos ?? [])).catch(() => {});
      return;
    }
    void fetchVideos(groupName);
  }, [fetchVideos, groupName]);

  return { videos, privateVideos, loading, error, reload };
}
