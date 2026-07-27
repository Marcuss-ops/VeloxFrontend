/**
 * publishEditorSession — extended response assertion.
 *
 * Mirrors the bff.publishEditorSession.test.ts pattern (Vitest +
 * // @vitest-environment node + document.cookie mock). The live-update
 * surface added in this commit is the same shape as before PLUS three
 * fields the Groups card consumes:
 *
 *   - status                  'published' after orchestrator stamps
 *   - actual_privacy          YouTube-confirmed privacy
 *   - youtube_sync_status     'confirmed' / 'drift' / 'pending' / 'failed'
 *
 * The broadcast-on-success flow is exercised by stubbing the global
 * BroadcastChannel before each test.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// @vitest-environment node

class CapturedMessage {
    constructor(public readonly name: string, public readonly payload: unknown) {}
}
class FakeBroadcastChannel {
    static readonly sent: CapturedMessage[] = [];
    static reset(): void {
        FakeBroadcastChannel.sent.length = 0;
    }
    readonly name: string;
    constructor(name: string) {
        this.name = name;
    }
    postMessage(payload: unknown): void {
        FakeBroadcastChannel.sent.push(new CapturedMessage(this.name, payload));
    }
    close(): void {
        // no-op
    }
    addEventListener(): void {
        // no-op (consumer side is in web/src)
    }
    removeEventListener(): void {
        // no-op
    }
}

beforeEach(() => {
    FakeBroadcastChannel.reset();
    // Install a fake BroadcastChannel on the global object so the BFF
    // helper has something to use.
    (globalThis as unknown as { BroadcastChannel: typeof FakeBroadcastChannel }).BroadcastChannel =
        FakeBroadcastChannel;
    // Re-attach document.cookie + fetch.
    installDomCookieMock();
    installFetchMock();
});

import {
    publishEditorSession,
    publishBroadcast,
    type PublishYouTubeEditorSessionResponse,
} from '../bff';

const documentCookieSetter = `
let __cookie = 'csrf_token=test-csrf';
Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() { return __cookie; },
    set(v) {
        const idx = v.indexOf('=');
        const name = idx > -1 ? v.slice(0, idx) : v;
        const value = idx > -1 ? v.slice(idx + 1) : '';
        if (/^[^;]+;\s*expires=Thu, 01 Jan 1970/.test(v) || value === '') return;
        const existing = __cookie.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
        if (existing) {
            __cookie = __cookie.replace(existing, name + '=' + value);
        } else {
            __cookie = __cookie ? __cookie + '; ' + name + '=' + value : name + '=' + value;
        }
    },
});`;

function installDomCookieMock(): void {
    const g = globalThis as unknown as { document?: { cookie: string } };
    if (g.document) return;
    // Build a minimal document with a cookie getter/setter that emulates
    // a string-cookie store. BFF helpers read document.cookie for the
    // csrf_token; tests don't need a full DOM.
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

function installFetchMock(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (
        _url: string,
        _init?: RequestInit,
    ): Promise<Response> => {
        return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
}

describe('publishEditorSession (extended payload)', () => {
    it('returns the extended payload containing status, actual_privacy, and youtube_sync_status', async () => {
        const responseShape: PublishYouTubeEditorSessionResponse = {
            public_url: 'https://youtu.be/abc',
            video_id: 'yt_abc',
            privacy_status: 'public',
            published_at: '2026-07-27T10:00:00Z',
            status: 'published',
            actual_privacy: 'public',
            youtube_sync_status: 'confirmed',
        };
        // Replace fetch to return the shape.
        (globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
            return new Response(JSON.stringify(responseShape), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }) as unknown as typeof fetch;

        const result = await publishEditorSession('proj_123', {
            title: 'Ciao',
            privacy_status: 'public',
        });
        expect(result.status).toBe('published');
        expect(result.actual_privacy).toBe('public');
        expect(result.youtube_sync_status).toBe('confirmed');
        expect(result.public_url).toBe('https://youtu.be/abc');
        expect(result.video_id).toBe('yt_abc');
    });

    it('publishBroadcast posts on the cross-SPA channel', () => {
        publishBroadcast({
            status: 'published',
            actual_privacy: 'public',
            youtube_sync_status: 'confirmed',
            youtube_video_id: 'yt_abc',
            velox_project_id: 'proj_123',
        });
        expect(FakeBroadcastChannel.sent.length).toBe(1);
        const sent = FakeBroadcastChannel.sent[0];
        expect(sent.name).toBe('instaedit-publish');
        expect((sent.payload as Record<string, unknown>).emitted_at).toBeTruthy();
        expect((sent.payload as Record<string, unknown>).youtube_video_id).toBe('yt_abc');
        expect((sent.payload as Record<string, unknown>).status).toBe('published');
    });
});
