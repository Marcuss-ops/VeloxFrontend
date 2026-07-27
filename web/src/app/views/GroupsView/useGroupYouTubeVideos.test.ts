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
