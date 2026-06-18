'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEMO_GROUPS } from '@/lib/demo-data';
import { groupsApi } from '@/lib/youtube';
import type { YouTubeGroup } from '@/lib/youtube/types';

interface UseYouTubeGroupsResult {
  groups: YouTubeGroup[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useYouTubeGroups(): UseYouTubeGroupsResult {
  const [groups, setGroups] = useState<YouTubeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupsApi.listGroups();
      setGroups(data);
    } catch {
      setGroups(DEMO_GROUPS);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { groups, loading, error, reload: load };
}
