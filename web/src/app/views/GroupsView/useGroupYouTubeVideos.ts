/**
 * useGroupYouTubeVideos — react-query hook for the Groups video grid.
 *
 * Auto-refresh shape (chosen over postMessage in the architecture
 * validation, see thinker's recommendation):
 *   - refetchOnWindowFocus: true → when the operator returns from a
 *     Dark Editor tab, the latest editor_status / actual_privacy is
 *     picked up on focus without any IPC bridging.
 *   - refetchInterval: 10_000 (10s) → catches asynchronous backend
 *     updates (publishing → published) when the grid stays open on a
 *     secondary monitor.
 *   - staleTime: 5_000 → doesn't re-fetch on internal re-renders.
 *
 * Cache key shape: ['group', groupId, 'youtube', 'videos', opts] so
 * the dashboard's group-picker can mount multiple distinct Group
 * routes (e.g. a future "Compare two groups" view) without cache
 * collisions.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listGroupYouTubeVideos } from '@/lib/api/youtubeGroupsApi';
import type {
    GroupYouTubeVideoEntry,
    GroupYouTubeVideosResponse,
} from '@/types/youtubeGroups';

export interface UseGroupYouTubeVideosArgs {
    groupId: number | string | undefined;
    includeSubgroups?: boolean;
}

export interface UseGroupYouTubeVideosResult {
    videos: GroupYouTubeVideoEntry[];
    warnings: string[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    /** Manual refetch — exposed for "Retry" button on error banner. */
    refetch: () => void;
}

export function groupYouTubeVideosQueryKey(
    groupId: number | string | undefined,
    includeSubgroups: boolean,
): readonly unknown[] {
    // Normalise the group id to a string so callers passing either
    // `7` or `'7'` (typically from useParams' string-only return) hit
    // the same cache entry.
    const normalised = groupId == null ? groupId : String(groupId);
    return ['group', normalised, 'youtube', 'videos', { includeSubgroups }] as const;
}

export function useGroupYouTubeVideos(
    args: UseGroupYouTubeVideosArgs,
): UseGroupYouTubeVideosResult {
    const { groupId, includeSubgroups = false } = args;

    const query = useQuery<GroupYouTubeVideosResponse, Error>({
        queryKey: groupYouTubeVideosQueryKey(groupId, includeSubgroups),
        queryFn: ({ signal }) =>
            listGroupYouTubeVideos(groupId as number | string, {
                includeSubgroups,
                signal,
            }),
        enabled: groupId !== undefined && groupId !== null && `${groupId}` !== '',
        refetchOnWindowFocus: true,
        refetchInterval: 10_000,
        staleTime: 5_000,
        placeholderData: keepPreviousData,
    });

    return {
        videos: query.data?.videos ?? [],
        warnings: query.data?.warnings ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error ?? null,
        refetch: () => {
            void query.refetch();
        },
    };
}
