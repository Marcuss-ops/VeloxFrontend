'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EditorSessionDetail } from '@/lib/api/bff/youtube';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import { listGroupPrivateVideos } from '@/lib/api/bff/youtubeGroups';
import { getEditorSessionByProject } from '@/lib/api/bff';

interface UseBatchYouTubeTargetsOptions {
  enabled: boolean;
  currentProjectId?: string;
  currentProjectName?: string;
  groupId?: number;
}

/**
 * Draft covers opened from a group receive the group's private-video catalog
 * from InstaEdit. Without a group handoff, keep the single-session fallback.
 */
export type ProjectEditorTarget = GroupVideo;

function targetFromSession(session: EditorSessionDetail, projectName?: string): ProjectEditorTarget {
  const videoID = session.youtube_video_id;
  const channelName = session.channel_id || `Account #${session.platform_account_id}`;
  // Extended contract: thumbnail_url is the canonical wire name,
  // source_thumbnail_url the legacy fallback.
  const thumbnail = session.thumbnail_url || session.source_thumbnail_url || '';
  return {
    youtube_video_id: videoID,
    video_id: videoID,
    title: projectName || videoID,
    description: '',
    thumbnail_url: thumbnail,
    thumbnail,
    // The backend resolves privacy_status as the authoritative
    // projection (actual read-back wins, desired fallback) — prefer it
    // over the local derivation.
    privacy_status: session.privacy_status || session.actual_privacy || session.desired_privacy || 'private',
    actual_privacy: session.actual_privacy || undefined,
    category_id: session.category_id,
    processing_status: 'processed',
    platform_account_id: session.platform_account_id,
    channel_name: channelName,
    channel_title: session.channel_id,
    channel_id: session.channel_id,
    editor_status: session.status,
    editor_session_id: session.id,
    velox_project_id: session.velox_project_id,
    published_at: session.publish_at || undefined,
  };
}

export function videoKey(video: Pick<ProjectEditorTarget, 'platform_account_id' | 'youtube_video_id'>): string {
  return `${video.platform_account_id}:${video.youtube_video_id}`;
}

/**
 * Resolves the single target attached to the current Velox project.
 *
 * This is intentionally not a batch catalog hook. InstaEdit authorizes and
 * owns groups, channels, associations, and video selection; Velox receives
 * only the opaque project handle and the minimum target context needed by
 * the native editor/export surface.
 */
export function useBatchYouTubeTargets({
  enabled,
  currentProjectId,
  currentProjectName,
  groupId,
}: UseBatchYouTubeTargetsOptions) {
  const [targets, setTargets] = useState<ProjectEditorTarget[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const videos = targets;
  const selectedAccountId: number | 'all' = 'all';
  const accounts = useMemo(
    () => Array.from(new Map(targets.map((video) => [video.platform_account_id, { id: video.platform_account_id, name: video.channel_name }])).values()),
    [targets],
  );

  const resetSelection = useCallback(() => {
    setSelectedVideoIds((targets[0] ? [targets[0].video_id] : []));
  }, [targets]);

  const selectAllVisible = useCallback(() => {
    setSelectedVideoIds(targets.map((video) => video.video_id));
  }, [targets]);

  const deselectAll = useCallback(() => setSelectedVideoIds([]), []);

  const selectLatest = useCallback(() => {
    const latest = Array.from(new Map(targets.map((video) => [video.platform_account_id, video])).values());
    setSelectedVideoIds(latest.map((video) => video.video_id));
  }, [targets]);

  const toggleVideo = useCallback((video: ProjectEditorTarget) => {
    setSelectedVideoIds((current) => current.includes(video.video_id)
      ? current.filter((id) => id !== video.video_id)
      : [...current, video.video_id]);
  }, []);

  useEffect(() => {
    if (!enabled || !currentProjectId) {
      setTargets([]);
      setSelectedVideoIds([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setWarnings([]);
    // Use the authenticated BFF client: the plain fetch used here carried
    // no editor bearer header, so the backend rejected the session lookup
    // with 401 and the target list never resolved.
    const sessionPromise = getEditorSessionByProject(currentProjectId);
    const videosPromise = groupId ? listGroupPrivateVideos(groupId) : Promise.resolve(null);
    void Promise.all([sessionPromise, videosPromise])
      .then(([session, groupResponse]) => {
        if (controller.signal.aborted) return;
        const nextTarget = targetFromSession(session, currentProjectName);
        const groupTargets = groupResponse?.videos || [];
        const nextTargets = groupTargets.length > 0
          ? (groupTargets.some((video) => video.video_id === nextTarget.video_id) ? groupTargets : [nextTarget, ...groupTargets])
          : [nextTarget];
        setTargets(nextTargets);
        setSelectedVideoIds([nextTarget.video_id]);
        setWarnings(groupResponse?.warnings || []);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setTargets([]);
        setSelectedVideoIds([]);
        setError(reason instanceof Error ? reason.message : 'Editor project context unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [currentProjectId, currentProjectName, enabled, groupId]);

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId: (_id: number | 'all') => undefined,
    videos,
    visibleVideos: videos,
    latestPerChannel: videos,
    selectedVideoIds,
    setSelectedVideoIds,
    selectedCount: selectedVideoIds.length,
    toggleVideo,
    selectAllVisible,
    deselectAll,
    selectLatest,
    resetSelection,
    loadingGroups: false,
    loadingVideos: loading,
    loading,
    error,
    warnings,
  };
}
