/**
 * useEditorSessionLiveUpdate — the listener side of the cross-SPA
 * publish-event channel.
 *
 * PROVIDES:
 *   - On mount: subscribe to BroadcastChannel('instaedit-publish')
 *     and react-query-cache-mutate any matching group card row to
 *     the optimistic target the dark editor just published.
 *   - In parallel: a short-poll loop (5s cadence, 30s cap, early-stops
 *     when the GET reports status=published + youtube_sync_status
 *     =confirmed) catches the drift reconciler's eventual
 *     actual_privacy update.
 *   - Exposes a single `start()` function the caller fires when the
 *     card row is rendered (so we don't run two pollers per card).
 *   - Cleans up on unmount (AbortController cancellation).
 *
 * WHY THE HYBRID:
 *   - BroadcastChannel: instant cross-tab UX for the publish the
 *     operator JUST performed in the dark_editor tab. Survives a
 *     dark_editor reload (the next publish re-emits).
 *   - Short-poll: catches ANY drift that's NOT preceded by an
 *     active dark editor publish — the most common case is the
 *     drift_reconciler stamping actual_privacy after a publish the
 *     operator completed earlier. The 10s react-query
 *     refetchOnWindowFocus / refetchInterval in
 *     useGroupYouTubeVideos already catches MOST drift; this hook
 *     exists for the "+1 second" optimistic feel between the
 *     publish POST and the next refetch tick.
 *
 * NO SSE: the user spec explicitly allowed SSE or short-poll.
 * Short-poll ships faster (zero backend work) and is testable in
 * node without flakiness. SSE is the obvious next iteration once
 * the backend exposes text/event-stream; that's a Phase 3
 * followup.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEditorSessionByProject } from '@/lib/api/youtubeGroupsApi';
import {
    PUBLISH_CHANNEL_NAME,
    isPublishBroadcastPayload,
    type PublishBroadcastPayload,
} from '@/lib/broadcast/publishChannel';
import { groupYouTubeVideosQueryKey } from '@/app/views/GroupsView/useGroupYouTubeVideos';
import type { GroupYouTubeVideoEditorStatus, GroupYouTubeVideoEntry, GroupYouTubeVideoPrivacyStatus, GroupYouTubeVideoSyncStatus } from '@/types/youtubeGroups';

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_ATTEMPTS = 6; // 30 seconds cap total.
const STALE_EVENT_THRESHOLD_MS = 60_000; // ignore events older than 60s.

/**
 * Patch a single cache entry in place. We deliberately keep the
 * cache shape stable (GroupYouTubeVideoEntry[]) by mutating the
 * object the query owns — react-query's structural sharing means
 * downstream components re-render only when the patched fields
 * differ.
 */
function patchVideoEntry(
    videos: GroupYouTubeVideoEntry[],
    payload: PublishBroadcastPayload | { youtube_video_id: string; status: string; actual_privacy: string; youtube_sync_status: string },
): GroupYouTubeVideoEntry[] {
    return videos.map((v) =>
        v.youtube_video_id === payload.youtube_video_id
            ? {
                ...v,
                editor_status: payload.status as GroupYouTubeVideoEditorStatus,
                actual_privacy: payload.actual_privacy as GroupYouTubeVideoPrivacyStatus | undefined,
                youtube_sync_status: payload.youtube_sync_status as GroupYouTubeVideoSyncStatus | undefined,
            }
            : v,
    );
}

export interface UseEditorSessionLiveUpdateArgs {
    /** velox_project_id of the card the operator is currently looking at.
     *  Used to filter BroadcastChannel events (the channel is shared
     *  across every open card; we only care about the one in front). */
    veloxProjectId: string | undefined;
    /** Group id — needed to find the right react-query cache slice. */
    groupId: number | string | undefined;
    /** Include subgroups, must match the listing call. */
    includeSubgroups?: boolean;
}

export interface UseEditorSessionLiveUpdateHandle {
    /** Fire-and-forget. Idempotent: calling start() while already
     *  running is a no-op (next polling tick takes over). The hook
     *  auto-starts on mount too — start is a manual nudge for the
     *  case where the operator wants to bypass mount-time scheduling
     *  (e.g. the publish dialog just closed). */
    start: () => void;
}

export function useEditorSessionLiveUpdate(
    args: UseEditorSessionLiveUpdateArgs,
): UseEditorSessionLiveUpdateHandle {
    const { veloxProjectId, groupId, includeSubgroups = false } = args;
    const queryClient = useQueryClient();
    const abortRef = useRef<AbortController | null>(null);

    // Apply an optimistic patch to every cached group listing whose
    // ID matches the event's youtube_video_id. Returns true on
    // successful patch.
    const applyPatch = useCallback(
        (payload: PublishBroadcastPayload) => {
            const cacheKey = groupYouTubeVideosQueryKey(groupId, includeSubgroups);
            const cached = queryClient.getQueryData<{ videos: GroupYouTubeVideoEntry[] }>(cacheKey);
            if (!cached) {
                // No cached listing yet — the operator hasn't opened
                // the Groups page. Nothing to do; the next mount-time
                // fetch will pick up the canonical state from the
                // backend.
                return;
            }
            queryClient.setQueryData(cacheKey, {
                ...cached,
                videos: patchVideoEntry(cached.videos, payload),
            });
        },
        [groupId, includeSubgroups, queryClient],
    );

    // Short-poll loop. Aborts on unmount or when the caller fires
    // abort manually.
    const startPolling = useCallback(
        (signal: AbortSignal) => {
            const tick = async (attempt: number) => {
                if (signal.aborted || attempt > POLL_MAX_ATTEMPTS) {
                    return;
                }
                try {
                    const detail = await getEditorSessionByProject(veloxProjectId as string, { signal });
                    applyPatch({
                        status: detail.status,
                        actual_privacy: detail.actual_privacy ?? '',
                        youtube_sync_status: detail.youtube_sync_status ?? '',
                        youtube_video_id: detail.youtube_video_id,
                        velox_project_id: detail.velox_project_id,
                        emitted_at: new Date().toISOString(),
                    });
                    if (detail.status === 'published' && detail.youtube_sync_status === 'confirmed') {
                        return; // early-stop
                    }
                } catch (err) {
                    // Swallow network errors during short-poll. The
                    // next refetchOnWindowFocus will catch up.
                    if ((err as Error)?.name === 'AbortError') return;
                }
                if (signal.aborted || attempt >= POLL_MAX_ATTEMPTS) return;
                const handle = setTimeout(() => {
                    void tick(attempt + 1);
                }, POLL_INTERVAL_MS);
                signal.addEventListener('abort', () => clearTimeout(handle), { once: true });
            };
            void tick(1);
        },
        [veloxProjectId, applyPatch],
    );

    // On mount: start the listener (if veloxProjectId is known) AND
    // the short-poll loop. AbortSignal cancels both on unmount or
    // when the watched veloxProjectId changes.
    useEffect(() => {
        if (!veloxProjectId || typeof BroadcastChannel === 'undefined') {
            return;
        }
        const ac = new AbortController();
        abortRef.current?.abort();
        abortRef.current = ac;

        const channel = new BroadcastChannel(PUBLISH_CHANNEL_NAME);
        const onMessage = (event: MessageEvent) => {
            const payload = event.data;
            if (!isPublishBroadcastPayload(payload)) return;
            // Filter on the project we're watching + reject stale events.
            if (payload.velox_project_id !== veloxProjectId) return;
            if (Date.now() - Date.parse(payload.emitted_at) > STALE_EVENT_THRESHOLD_MS) return;
            applyPatch(payload);
            // Cancel any pending poll because the broadcaster just
            // gave us a fresh read.
            ac.abort();
        };
        channel.addEventListener('message', onMessage);

        startPolling(ac.signal);

        return () => {
            channel.removeEventListener('message', onMessage);
            channel.close();
            ac.abort();
        };
    }, [veloxProjectId, applyPatch, startPolling]);

    const start = useCallback(() => {
        // Useful for "I just published in the dark editor; nudge the
        // listener now" — the use case is mostly covered by the
        // mount-time polling, but a manual nudge lets the card
        // surface a "verifying…" state synchronously.
        if (!veloxProjectId) return;
        if (abortRef.current && !abortRef.current.signal.aborted) {
            return;
        }
        const ac = new AbortController();
        abortRef.current = ac;
        startPolling(ac.signal);
    }, [veloxProjectId, startPolling]);

    return { start };
}
