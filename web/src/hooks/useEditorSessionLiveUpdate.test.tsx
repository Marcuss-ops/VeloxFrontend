/**
 * useEditorSessionLiveUpdate — listener contract tests.
 *
 * Two scenarios:
 *   1. PAGE-LEVEL MOUNT (veloxProjectId === undefined): the listener
 *      catches every cross-tab publish event and optimistically
 *      patches the React Query cache for the matching row, even when
 *      the row had no velox_project_id at mount time. The card must
 *      re-render with the new editor_status === 'published' within
 *      1s of the postMessage (no 10s refetchInterval wait).
 *   2. PER-CARD MOUNT (veloxProjectId === 'vp-X'): a regression
 *      guard -- the listener still filters by velox_project_id and
 *      ignores events for other projects while patching matching
 *      events synchronously.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import {
    PUBLISH_CHANNEL_NAME,
    type PublishBroadcastPayload,
} from '@/lib/broadcast/publishChannel';
import { groupYouTubeVideosQueryKey } from '@/app/views/GroupsView/useGroupYouTubeVideos';
import type {
    GroupYouTubeVideoEditorStatus,
    GroupYouTubeVideoEntry,
    GroupYouTubeVideoPrivacyStatus,
    GroupYouTubeVideoSyncStatus,
} from '@/types/youtubeGroups';
import { useEditorSessionLiveUpdate } from './useEditorSessionLiveUpdate';

// ---------------------------------------------------------------------------
// BroadcastChannel shim: jsdom 28 doesn't implement BroadcastChannel. We
// implement the four APIs the hook touches and a NAME-KEYED cross-instance
// fan-out so the publisher and subscriber can be different FakeBroadcastChannel
// instances (mirroring real cross-tab BroadcastChannel semantics where the
// sender does not receive its own message).
// ---------------------------------------------------------------------------
type MessageListener = (event: MessageEvent) => void;

class FakeBroadcastChannel {
    static instances: FakeBroadcastChannel[] = [];

    // Exposed so postMessage() on a peer can deliver across instances.
    // Public read-only is fine for the test surface.
    readonly listeners: Set<MessageListener> = new Set();

    constructor(public name: string) {
        FakeBroadcastChannel.instances.push(this);
    }

    postMessage(data: PublishBroadcastPayload): void {
        // Real BroadcastChannel delivers to listeners on OTHER contexts
        // sharing the same channel name; the sender itself does NOT
        // receive its own postMessage. The shim mimics that by looking
        // up peers across the static registry and dispatching to every
        // peer EXCEPT the sender.
        const event = { data } as MessageEvent;
        for (const peer of FakeBroadcastChannel.instances) {
            if (peer === this) continue;
            if (peer.name !== this.name) continue;
            for (const fn of Array.from(peer.listeners)) fn(event);
        }
    }

    addEventListener(_type: 'message', fn: MessageListener): void {
        this.listeners.add(fn);
    }

    removeEventListener(_type: 'message', fn: MessageListener): void {
        this.listeners.delete(fn);
    }

    close(): void {
        this.listeners.clear();
    }
}

function buildQueryClientWithCache(
    groupId: string,
    videos: GroupYouTubeVideoEntry[],
): { queryClient: QueryClient; Wrapper: React.FC<{ children: React.ReactNode }> } {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: 0, gcTime: Infinity },
        },
    });
    queryClient.setQueryData(groupYouTubeVideosQueryKey(groupId, false), {
        videos,
        warnings: [],
    });

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

    return { queryClient, Wrapper };
}

describe('useEditorSessionLiveUpdate — page-level mount', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'BroadcastChannel',
            FakeBroadcastChannel as unknown as typeof BroadcastChannel,
        );
        FakeBroadcastChannel.instances = [];
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('patches the GroupVideosResponse cache within 1s of a publish broadcast, even when the video had no velox_project_id at mount time', async () => {
        const video: GroupYouTubeVideoEntry = {
            youtube_video_id: 'vid-abc',
            title: 'Open-then-publish video',
            thumbnail_url: 'https://i.ytimg.com/vi/vid-abc/hqdefault.jpg',
            privacy_status: 'unlisted' as GroupYouTubeVideoPrivacyStatus,
            processing_status: 'processed',
            platform_account_id: 7,
            channel_name: 'Test Channel',
            velox_project_id: undefined, // <-- the open-then-publish race we're covering
            editor_status: 'ready' as GroupYouTubeVideoEditorStatus,
        };
        const { queryClient, Wrapper } = buildQueryClientWithCache('42', [video]);

        renderHook(
            () =>
                useEditorSessionLiveUpdate({
                    veloxProjectId: undefined,
                    groupId: '42',
                    includeSubgroups: false,
                }),
            { wrapper: Wrapper },
        );

        // Hook installed its BroadcastChannel subscriber.
        expect(FakeBroadcastChannel.instances.length).toBeGreaterThan(0);
        expect(FakeBroadcastChannel.instances[0]?.name).toBe(PUBLISH_CHANNEL_NAME);

        const start = Date.now();
        await act(async () => {
            // The publisher lives in a different SPA tab in production;
            // here we just deliver from a fresh shim on the same name.
            const publisher = new FakeBroadcastChannel(PUBLISH_CHANNEL_NAME);
            publisher.postMessage({
                status: 'published',
                actual_privacy: 'unlisted',
                youtube_sync_status: 'confirmed' satisfies GroupYouTubeVideoSyncStatus,
                youtube_video_id: 'vid-abc',
                velox_project_id: 'vp-late-mint', // minted+returned AFTER mount
                emitted_at: new Date().toISOString(),
            });
        });
        const elapsed = Date.now() - start;

        // The card MUST reflect the new state on the SAME render frame
        // as the broadcast -- no 10s refetchInterval wait.
        const cached = queryClient.getQueryData<{ videos: GroupYouTubeVideoEntry[] }>(
            groupYouTubeVideosQueryKey('42', false),
        );
        expect(cached?.videos[0]?.editor_status).toBe('published');
        expect(cached?.videos[0]?.actual_privacy).toBe('unlisted');
        expect(cached?.videos[0]?.youtube_sync_status).toBe('confirmed');
        // Cache-bust appended onto the thumbnail url so the <img src>
        // re-fetches from the CDN the same instant the badge flips.
        expect(cached?.videos[0]?.thumbnail_url).toMatch(/[?&]v=/);
        // Sub-1s: the hook + applyPatch path runs synchronously inside
        // the BroadcastChannel message handler -- no poller involved.
        expect(elapsed).toBeLessThan(1000);
    });
});

describe('useEditorSessionLiveUpdate — per-card mount (regression)', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'BroadcastChannel',
            FakeBroadcastChannel as unknown as typeof BroadcastChannel,
        );
        FakeBroadcastChannel.instances = [];
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('still filters by velox_project_id when mounted per-card and patches the matching event synchronously', async () => {
        const video: GroupYouTubeVideoEntry = {
            youtube_video_id: 'vid-xyz',
            title: 'Per-card video',
            thumbnail_url: 'https://i.ytimg.com/vi/vid-xyz/hqdefault.jpg',
            privacy_status: 'private' as GroupYouTubeVideoPrivacyStatus,
            processing_status: 'processed',
            platform_account_id: 9,
            channel_name: 'Other Channel',
            velox_project_id: 'vp-our-card',
            editor_status: 'editing' as GroupYouTubeVideoEditorStatus,
        };
        const { queryClient, Wrapper } = buildQueryClientWithCache('42', [video]);

        renderHook(
            () =>
                useEditorSessionLiveUpdate({
                    veloxProjectId: 'vp-our-card',
                    groupId: '42',
                    includeSubgroups: false,
                }),
            { wrapper: Wrapper },
        );

        // Event for a DIFFERENT project must be ignored (the per-card
        // filter is preserved).
        await act(async () => {
            new FakeBroadcastChannel(PUBLISH_CHANNEL_NAME).postMessage({
                status: 'published',
                actual_privacy: 'public',
                youtube_sync_status: 'confirmed',
                youtube_video_id: 'vid-other',
                velox_project_id: 'vp-other',
                emitted_at: new Date().toISOString(),
            });
        });
        const before = queryClient.getQueryData<{ videos: GroupYouTubeVideoEntry[] }>(
            groupYouTubeVideosQueryKey('42', false),
        );
        expect(before?.videos[0]?.editor_status).toBe('editing');

        // The matching event DOES patch.
        await act(async () => {
            new FakeBroadcastChannel(PUBLISH_CHANNEL_NAME).postMessage({
                status: 'published',
                actual_privacy: 'public',
                youtube_sync_status: 'confirmed',
                youtube_video_id: 'vid-xyz',
                velox_project_id: 'vp-our-card',
                emitted_at: new Date().toISOString(),
            });
        });
        const after = queryClient.getQueryData<{ videos: GroupYouTubeVideoEntry[] }>(
            groupYouTubeVideosQueryKey('42', false),
        );
        expect(after?.videos[0]?.editor_status).toBe('published');
        expect(after?.videos[0]?.actual_privacy).toBe('public');
    });
});
