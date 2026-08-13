// @vitest-environment jsdom
//
// Unit test for the YouTube session gate hook.
//
// Each test stubs `fetch` with `vi.stubGlobal` and verifies the
// discriminated state returned by the hook. The 8 branches under
// test match the documented mapping in useYouTubeSessionGate.ts:
//   loading (initial) | unauthorized (401) | not_found (404) |
//   editable_editing | editable_failed |
//   readonly_publishing | readonly_published | readonly_unknown |
//   error (5xx / network)
//
// The `loading` initial state is asserted explicitly. FAIL-CLOSED
// contract: an out-of-spec 200 status maps to readonly_unknown and must
// NEVER enable editing.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import {
    useYouTubeSessionGate,
    type YouTubeEditorSessionDetail,
} from '@/hooks/useYouTubeSessionGate';

const baseSession: YouTubeEditorSessionDetail = {
    id: 'session-test-1',
    workspace_id: 42,
    platform_account_id: 999,
    youtube_video_id: 'yt-test-1',
    velox_project_id: 'proj-test-1',
    desired_privacy: 'private',
    status: 'editing',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

function stubFetch(status: number, body: unknown = null): void {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
            new Response(body !== null ? JSON.stringify(body) : '', {
                status,
                headers: body !== null ? { 'content-type': 'application/json' } : {},
            }),
        ),
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('useYouTubeSessionGate', () => {
    it('starts in the loading state before the fetch resolves', () => {
        // Never-resolving promise keeps the hook in 'loading' for the
        // whole assertion window — guards against regressions where
        // a fast-resolution state leaks into the initial render.
        vi.stubGlobal(
            'fetch',
            vi.fn().mockReturnValue(new Promise<Response>(() => {})),
        );
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        expect(result.current.state).toBe('loading');
    });

    it('maps HTTP 401 to unauthorized', async () => {
        stubFetch(401);
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('unauthorized'));
    });

    it('maps HTTP 404 to not_found', async () => {
        stubFetch(404, { error: 'editor session not found' });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('not_found'));
    });

    it('maps 200 + status=editing to editable_editing', async () => {
        stubFetch(200, { ...baseSession, status: 'editing' });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('editable_editing'));
        if (result.current.state === 'editable_editing') {
            expect(result.current.session.status).toBe('editing');
            expect(result.current.session.youtube_video_id).toBe('yt-test-1');
        }
    });

    it('maps 200 + status=failed to editable_failed', async () => {
        stubFetch(200, {
            ...baseSession,
            status: 'failed',
            last_error: 'youtube api 502',
        });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('editable_failed'));
        if (result.current.state === 'editable_failed') {
            expect(result.current.session.status).toBe('failed');
            expect(result.current.session.last_error).toBe('youtube api 502');
        }
    });

    it('maps 200 + status=publishing to readonly_publishing', async () => {
        stubFetch(200, { ...baseSession, status: 'publishing' });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('readonly_publishing'));
        if (result.current.state === 'readonly_publishing') {
            expect(result.current.session.status).toBe('publishing');
        }
    });

    it('maps 200 + status=published to readonly_published', async () => {
        stubFetch(200, {
            ...baseSession,
            status: 'published',
            actual_privacy: 'public',
        });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('readonly_published'));
        if (result.current.state === 'readonly_published') {
            expect(result.current.session.actual_privacy).toBe('public');
        }
    });

    it('FAILS CLOSED on an out-of-spec 200 status (readonly_unknown, never editable)', async () => {
        stubFetch(200, { ...baseSession, status: 'graders_only' });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('readonly_unknown'));
        if (result.current.state === 'readonly_unknown') {
            expect(result.current.session.status).toBe('graders_only');
        }
    });

    it('re-validates while open: editing → publishing flips the gate to read-only', async () => {
        // Every fetch returns a fresh publishing row (the backend flips the
        // session before the editor is even open). The gate must land in
        // readonly_publishing — never editable — and the poll must keep
        // re-validating (≥2 fetches with a 50ms interval + real timers).
        const fetchMock = vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({ ...baseSession, status: 'publishing' }),
                    { status: 200, headers: { 'content-type': 'application/json' } },
                ),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result, unmount } = renderHook(() => useYouTubeSessionGate('proj-test-1', 50));

        // The gate never opens the editor in an editable state for a
        // publishing session, and the poll keeps the read-only state fresh.
        await waitFor(() => expect(result.current.state).toBe('readonly_publishing'));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 2000 });

        unmount();
    });

    it('maps a non-401/404 !ok response to error', async () => {
        stubFetch(503, { error: 'youtube store not configured' });
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('error'));
        if (result.current.state === 'error') {
            expect(result.current.message).toContain('youtube store not configured');
        }
    });

    it('maps a thrown fetch to error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
        const { result } = renderHook(() => useYouTubeSessionGate('proj-test-1'));
        await waitFor(() => expect(result.current.state).toBe('error'));
        if (result.current.state === 'error') {
            expect(result.current.message).toContain('ECONNREFUSED');
        }
    });
});
