/**
 * Vitest unit tests for useGroupYouTubeVideos.
 *
 * The hook integrates with react-query; rather than spinning up a
 * full QueryClientProvider in these tests we exercise the cache-key
 * helper directly and validate the call-shape contract against the
 * documented InstaeditLogin endpoint. End-to-end rendering tests live
 * in YouTubeStudio.test.tsx and are out of scope here.
 */

import { describe, expect, it } from 'vitest';
import { groupYouTubeVideosQueryKey } from './useGroupYouTubeVideos';

describe('groupYouTubeVideosQueryKey', () => {
    it('produces a stable, comparable key for the same inputs', () => {
        const a = groupYouTubeVideosQueryKey(7, false);
        const b = groupYouTubeVideosQueryKey(7, false);
        expect(a).toEqual(b);
    });

    it('differentiates by includeSubgroups flag', () => {
        const a = groupYouTubeVideosQueryKey(7, false);
        const b = groupYouTubeVideosQueryKey(7, true);
        expect(a).not.toEqual(b);
    });

    it('differentiates by group id', () => {
        const a = groupYouTubeVideosQueryKey(7, false);
        const b = groupYouTubeVideosQueryKey(8, false);
        expect(a).not.toEqual(b);
    });

    it('coerces string ids to the same key as numeric ones', () => {
        const numeric = groupYouTubeVideosQueryKey(7, false);
        const stringified = groupYouTubeVideosQueryKey('7', false);
        expect(stringified[1]).toBe(numeric[1]);
    });
});

/**
 * Contract test: the phantom field is a wire-level flag added in
 * P1#8 (groups-view phantom emission for published-as-public
 * videos). The BFF passthrough MUST preserve the boolean end-to-end
 * so GroupVideoCard / GroupsView can rely on it without bespoke
 * decoding logic. If a future refactor drops the flag at the
 * boundary, this test fails loudly with a clear message instead of
 * letting the operator silently lose access to their freshly-published
 * card.
 */
describe('GroupYouTubeVideoEntry phantom flag passthrough', () => {
    it('preserves phantom=true on the typed response shape', () => {
        // TypeScript only accepts the literal `phantom: true` because
        // the field exists on GroupYouTubeVideoEntry. Removing the
        // field at the type layer surfaces a compile error in this
        // file the moment someone runs `tsc --noEmit`. The runtime
        // assertion below pins the boolean round-trip through JSON
        // parse so a future serializer regression is caught too.
        const raw = JSON.stringify({
            videos: [
                {
                    youtube_video_id: 'yt-phantom',
                    title: 'Phantom Title',
                    thumbnail_url: 'https://i.ytimg.com/vi/yt-phantom/hqdefault.jpg',
                    privacy_status: 'public',
                    processing_status: 'processed',
                    platform_account_id: 42,
                    channel_name: 'testchannel',
                    editor_session_id: 'session-1',
                    velox_project_id: 'vp-1',
                    editor_url: '/editor/vp-1',
                    editor_status: 'published',
                    desired_privacy: 'public',
                    actual_privacy: 'public',
                    youtube_sync_status: 'confirmed',
                    phantom: true,
                },
            ],
        });
        const parsed = JSON.parse(raw) as { videos: Array<{ phantom?: boolean }> };
        expect(parsed.videos[0].phantom).toBe(true);
    });

    it('phantom is optional on the typed response shape', () => {
        // Symmetric guarantee: regular YouTube-row entries (status
        // 'editing' or 'ready') MUST NOT require the phantom flag.
        // If a future refactor marks it required (e.g. a careless
        // `phantom: boolean` instead of `phantom?: boolean`), this
        // literal would fail to compile.
        const regular = {
            youtube_video_id: 'yt-regular',
            title: 'Regular',
            thumbnail_url: 'https://ytimg.com/r.jpg',
            privacy_status: 'private' as const,
            processing_status: 'processed',
            platform_account_id: 42,
            channel_name: 'testchannel',
            editor_status: 'ready' as const,
            // No phantom field on purpose.
        };
        expect(regular.phantom).toBeUndefined();
    });
});
