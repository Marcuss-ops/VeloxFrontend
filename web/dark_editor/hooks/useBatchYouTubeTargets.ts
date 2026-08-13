'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EditorSessionDetail } from '@/lib/api/bff/youtube';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import { getEditorSessionByProject } from '@/lib/api/bff';

interface UseBatchYouTubeTargetsOptions {
  enabled: boolean;
  currentProjectId?: string;
  currentProjectName?: string;
}

/**
 * The editor receives one already-authorized target from InstaEdit.
 * Groups, channel catalogs, and group-channel membership are deliberately
 * absent from this state machine; those domains remain InstaEdit-owned.
 */
export type ProjectEditorTarget = GroupVideo;

function targetFromSession(session: EditorSessionDetail, projectName?: string): ProjectEditorTarget {
  const videoID = session.youtube_video_id;
  const channelName = session.channel_id || `Account #${session.platform_account_id}`;
  const thumbnail = session.source_thumbnail_url || '';
  return {
    youtube_video_id: videoID,
    video_id: videoID,
    title: projectName || videoID,
    description: '',
    thumbnail_url: thumbnail,
    thumbnail,
    privacy_status: session.actual_privacy || session.desired_privacy || 'private',
    actual_privacy: session.actual_privacy || undefined,
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
}: UseBatchYouTubeTargetsOptions) {
  const [target, setTarget] = useState<ProjectEditorTarget | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videos = useMemo(() => target ? [target] : [], [target]);
  const selectedAccountId: number | 'all' = target?.platform_account_id ?? 'all';
  const accounts = useMemo(
    () => target ? [{ id: target.platform_account_id, name: target.channel_name }] : [],
    [target],
  );

  const resetSelection = useCallback(() => {
    setSelectedVideoIds(target ? [target.video_id] : []);
  }, [target]);

  const selectAllVisible = useCallback(() => {
    setSelectedVideoIds(target ? [target.video_id] : []);
  }, [target]);

  const deselectAll = useCallback(() => setSelectedVideoIds([]), []);

  const selectLatest = useCallback(() => {
    setSelectedVideoIds(target ? [target.video_id] : []);
  }, [target]);

  const toggleVideo = useCallback((video: ProjectEditorTarget) => {
    setSelectedVideoIds((current) => current.includes(video.video_id) ? [] : [video.video_id]);
  }, []);

  useEffect(() => {
    if (!enabled || !currentProjectId) {
      setTarget(null);
      setSelectedVideoIds([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    // Use the authenticated BFF client: the plain fetch used here carried
    // no editor bearer header, so the backend rejected the session lookup
    // with 401 and the target list never resolved.
    void getEditorSessionByProject(currentProjectId)
      .then((session) => {
        if (controller.signal.aborted) return;
        const nextTarget = targetFromSession(session, currentProjectName);
        setTarget(nextTarget);
        setSelectedVideoIds([nextTarget.video_id]);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setTarget(null);
        setSelectedVideoIds([]);
        setError(reason instanceof Error ? reason.message : 'Editor project context unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [currentProjectId, currentProjectName, enabled]);

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
    warnings: [],
  };
}
