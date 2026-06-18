/**
 * useYouTubeOrchestratorData Hook
 *
 * Fetches real YouTube groups, channels, and videos from the API.
 * Replaces the previous mock data generator with live data.
 */

import { useState, useEffect, useCallback } from 'react';
import { youtubeApi } from '@/lib/api';

// ============================================
// Re-export the types used by the Orchestrator
// ============================================

export type PipelineStepId =
    | 'generate_video'
    | 'generate_thumbnail'
    | 'generate_title'
    | 'upload_video'
    | 'upload_thumbnail'
    | 'add_description'
    | 'add_tags'
    | 'schedule_publication'
    | 'check_performance';

export type VideoStatus =
    | 'draft'
    | 'ready'
    | 'missing_thumbnail'
    | 'uploaded_private'
    | 'scheduled'
    | 'test_active'
    | 'low_performance'
    | 'published'
    | 'completed';

export interface PerformanceCheckpoint {
    label: string;
    hours: number;
    views?: number;
    ctr?: number;
    revenue?: number;
    watchTime?: number;
    subscriberGain?: number;
}

export interface OrchestratorVideo {
    id: string;
    videoId?: string;
    channelId: string;
    channelTitle: string;
    channelThumbnail?: string;
    channelSubscriberCount?: number;
    status: VideoStatus;
    title: string;
    thumbnail?: string;
    description?: string;
    tags?: string[];
    scheduledAt?: string;
    publishedAt?: string;
    privacyStatus?: 'private' | 'unlisted' | 'public';
    pipelineProgress: Record<PipelineStepId, 'pending' | 'active' | 'completed' | 'error' | 'skipped'>;
    performance?: PerformanceCheckpoint[];
    createdAt: string;
    updatedAt: string;
}

export interface ChannelSummary {
    channelId: string;
    channelTitle: string;
    channelThumbnail?: string;
    channelSubscriberCount?: number;
    videoCount: number;
    statuses: Record<VideoStatus, number>;
    totalViews: number;
    totalRevenue: number;
}

export interface GroupSummary {
    groupName: string;
    channelCount: number;
    pendingCount: number;
    logoChannelId?: string;
    logoChannelTitle?: string;
    logoThumbnail?: string;
    channels: Array<{
        id: string;
        title: string;
        thumbnail?: string;
    }>;
}

type ManagerGroupsResponse = {
    ok?: boolean;
    groups?: Record<string, {
        name?: string;
        channels?: Array<{ id: string; title?: string; name?: string; thumbnail?: string }>;
    }> | Array<{
        name?: string;
        channels?: Array<{ id: string; title?: string; name?: string; thumbnail?: string }>;
    }>;
};

const normalizeGroups = (groups: ManagerGroupsResponse['groups']): Array<{
    name: string;
    channels?: Array<{ id: string; title?: string; name?: string; thumbnail?: string }>;
}> => {
    if (!groups) return [];
    const entries = Array.isArray(groups)
        ? groups.map(group => [group.name || '', group] as const)
        : Object.entries(groups);

    return entries
        .filter(([groupName]) => Boolean(groupName))
        .map(([groupName, group]) => ({
            name: group.name || groupName,
            channels: group.channels || [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

// ============================================
// Mapping helpers
// ============================================

/** Derive pipeline progress from real video metadata */
function derivePipelineProgress(video: {
    video_id?: string;
    title?: string;
    thumbnail?: string;
    description?: string;
    tags?: string[];
    published_at?: string;
    scheduled_time?: string;
    privacy_status?: string;
}): Record<PipelineStepId, 'pending' | 'active' | 'completed' | 'error' | 'skipped'> {
    const progress: Record<PipelineStepId, 'pending' | 'active' | 'completed' | 'error' | 'skipped'> = {
        generate_video: 'pending',
        generate_thumbnail: 'pending',
        generate_title: 'pending',
        upload_video: 'pending',
        upload_thumbnail: 'pending',
        add_description: 'pending',
        add_tags: 'pending',
        schedule_publication: 'pending',
        check_performance: 'pending',
    };

    if (video.video_id) {
        progress.generate_video = 'completed';
        progress.upload_video = 'completed';
    }
    if (video.thumbnail) {
        progress.generate_thumbnail = 'completed';
        progress.upload_thumbnail = 'completed';
    }
    if (video.title) {
        progress.generate_title = 'completed';
    }
    if (video.description) {
        progress.add_description = 'completed';
    }
    if (video.tags && video.tags.length > 0) {
        progress.add_tags = 'completed';
    }
    if (video.published_at || video.scheduled_time) {
        if (video.published_at && new Date(video.published_at) <= new Date()) {
            progress.schedule_publication = 'completed';
        } else if (video.scheduled_time) {
            progress.schedule_publication = 'completed';
        }
    }

    return progress;
}

/** Derive video status from real video metadata */
function deriveStatus(video: {
    video_id?: string;
    privacy_status?: string;
    published_at?: string;
    scheduled_time?: string;
    thumbnail?: string;
    view_count?: number;
    description?: string;
}): VideoStatus {
    const hasVideo = Boolean(video.video_id);
    const hasThumbnail = Boolean(video.thumbnail);
    const hasDesc = Boolean(video.description);
    const isPrivate = video.privacy_status === 'private';
    const isPublished = Boolean(video.published_at);
    const isScheduled = Boolean(video.scheduled_time);
    const views = video.view_count ?? 0;

    if (isPublished) {
        if (views > 0 && views < 5000) {
            return 'test_active';
        }
        return 'published';
    }

    if (isScheduled) {
        return 'scheduled';
    }

    if (hasVideo && isPrivate) {
        if (!hasThumbnail) {
            return 'missing_thumbnail';
        }
        if (hasDesc) {
            return 'uploaded_private';
        }
        return 'uploaded_private';
    }

    if (!hasVideo) {
        return 'draft';
    }

    return 'draft';
}

// ============================================
// Hook
// ============================================

export interface UseYouTubeOrchestratorDataResult {
    videos: OrchestratorVideo[];
    groups: GroupSummary[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    channelSubscriberCounts: Record<string, number>;
}

export function useYouTubeOrchestratorData(): UseYouTubeOrchestratorDataResult {
    const [videos, setVideos] = useState<OrchestratorVideo[]>([]);
    const [groups, setGroups] = useState<GroupSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [channelSubscriberCounts, setChannelSubscriberCounts] = useState<Record<string, number>>({});

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Load groups to build the overview immediately.
            const groupsRes = await youtubeApi.managerGroups().catch(() => null) as ManagerGroupsResponse | null;
            const groupData = normalizeGroups(groupsRes?.groups);

            const initialGroups: GroupSummary[] = groupData.map(group => ({
                groupName: group.name,
                channelCount: Array.isArray(group.channels) ? group.channels.length : 0,
                pendingCount: 0,
                logoChannelId: group.channels?.find(ch => ch.thumbnail)?.id ?? group.channels?.[0]?.id,
                logoChannelTitle: group.channels?.find(ch => ch.thumbnail)?.title || group.channels?.find(ch => ch.thumbnail)?.name || group.channels?.[0]?.title || group.channels?.[0]?.name,
                logoThumbnail: group.channels?.find(ch => ch.thumbnail)?.thumbnail ?? group.channels?.[0]?.thumbnail,
                channels: (group.channels || []).map(ch => ({
                    id: ch.id,
                    title: ch.title || ch.name || ch.id,
                    thumbnail: ch.thumbnail,
                })),
            }));

            setGroups(initialGroups);
            setVideos([]);
            setIsLoading(false);

            // 2. Fill counts in the background from the local upload log summary.
            const pending = await youtubeApi.pendingTasks().catch(() => null) as {
                ok?: boolean;
                groups?: Array<{
                    group_name: string;
                    pending_count: number;
                    channel_count: number;
                    logo_channel_id?: string;
                    logo_channel_title?: string;
                    logo_thumbnail?: string;
                }>;
            } | null;

            const pendingGroups = Array.isArray(pending?.groups) ? pending!.groups! : [];
            const pendingByName = new Map(pendingGroups.map(group => [group.group_name, group]));

            setGroups(prev => prev.map(group => {
                const pendingGroup = pendingByName.get(group.groupName);
                if (!pendingGroup) {
                    return group;
                }
                return {
                    ...group,
                    pendingCount: pendingGroup.pending_count,
                    channelCount: pendingGroup.channel_count || group.channelCount,
                    logoChannelId: pendingGroup.logo_channel_id || group.logoChannelId,
                    logoChannelTitle: pendingGroup.logo_channel_title || group.logoChannelTitle,
                    logoThumbnail: pendingGroup.logo_thumbnail || group.logoThumbnail,
                };
            }));

            // 3. Keep subscriber count map empty for now; this view does not depend on it.
            setChannelSubscriberCounts({});
        } catch (err) {
            console.error('[Orchestrator] Failed to load data:', err);
            setError('Impossibile caricare i dati YouTube. Verifica la connessione al server.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { videos, groups, isLoading, error, refetch: fetchData, channelSubscriberCounts };
}

export default useYouTubeOrchestratorData;
