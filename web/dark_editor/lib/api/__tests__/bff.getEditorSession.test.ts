/**
 * getEditorSessionByProject test — asserts the GET helper for the
 * post-publish short-poll fallback.
 *
 * Mirrors the existing node-environment pattern (Vitest + document
 * cookie mock + global fetch mock). The DTO shape mirrors
 * InstaeditLogin's youTubeEditorSessionDetail.
 */

// @vitest-environment node

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getEditorSessionByProject } from '../bff';

function installDomCookieMock(): void {
    const g = globalThis as unknown as { document?: { cookie: string } };
    if (g.document) return;
    const sandbox: { cookie: string } = { cookie: 'csrf_token=test-csrf' };
    Object.defineProperty(sandbox, 'cookie', {
        configurable: true,
        get() { return sandbox.cookie; },
        set(v: string) {
            const parts = v.split(';')[0].split('=');
            const name = parts[0];
            const value = parts.slice(1).join('=');
            const existing = sandbox.cookie.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
            if (existing) {
                sandbox.cookie = sandbox.cookie.replace(existing, name + '=' + value);
            } else {
                sandbox.cookie = sandbox.cookie ? sandbox.cookie + '; ' + name + '=' + value : name + '=' + value;
            }
        },
    });
    (globalThis as unknown as { document: { cookie: string } }).document = sandbox as unknown as { cookie: string };
}

beforeEach(() => {
    installDomCookieMock();
});

describe('getEditorSessionByProject', () => {
    it('returns the EditorSessionDetail shape from the GET endpoint', async () => {
        const shape = {
            id: 've_123',
            workspace_id: 45,
            platform_account_id: 99,
            youtube_video_id: 'yt_abc',
            velox_project_id: 'proj_123',
            desired_privacy: 'public',
            publish_at: null,
            status: 'published',
            last_error: '',
            actual_privacy: 'public',
            youtube_sync_status: 'confirmed',
            youtube_updated_at: '2026-07-27T10:00:00Z',
            created_at: '2026-07-26T10:00:00Z',
            updated_at: '2026-07-27T10:00:00Z',
        };
        const fetchSpy = vi.fn(async () => {
            return new Response(JSON.stringify(shape), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        });
        (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch;

        const result = await getEditorSessionByProject('proj_123');
        expect(result.id).toBe('ve_123');
        expect(result.status).toBe('published');
        expect(result.actual_privacy).toBe('public');
        expect(result.youtube_sync_status).toBe('confirmed');
        expect(result.youtube_updated_at).toBe('2026-07-27T10:00:00Z');
        // Verify the URL pattern (path-only; query string is empty for this endpoint).
        const calledUrl = fetchSpy.mock.calls[0][0] as string;
        expect(calledUrl).toContain('/api/v1/youtube/editor-sessions/by-project/proj_123');
        expect(calledUrl).not.toContain('?');
    });

    it('throws on 404 so the caller can treat missing rows distinctly', async () => {
        (globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
            return new Response(JSON.stringify({ error: 'video edit not found for velox_project_id' }), {
                status: 404,
                headers: { 'content-type': 'application/json' },
            });
        }) as unknown as typeof fetch;

        await expect(getEditorSessionByProject('proj_missing')).rejects.toThrow(/video edit not found/);
    });

    it('URL-encodes the veloxProjectId path segment', async () => {
        const fetchSpy = vi.fn(async () =>
            new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
        );
        (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch;

        await getEditorSessionByProject('proj/with spaces');
        const url = fetchSpy.mock.calls[0][0] as string;
        expect(url).toContain(encodeURIComponent('proj/with spaces'));
    });
});
