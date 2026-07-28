// @vitest-environment node
//
// publish-pipeline-error-paths:
//
// Six distinct dark-editor publish-pipeline cases the existing happy-
// path suite (bff.publishFlow.test.ts + bff.uploadMediaAsset.test.ts +
// bff.publishEditorSession.test.ts) did NOT pin. Five cover failure
// surfaces; the sixth pins the runtime null-input contract that the
// dialog-level "no Blob => no publish" guard depends on. Each one is
// isolated: vi.stubGlobal('fetch', ...) maps URL -> Response; the
// bffFetch + uploadMediaAsset + publishEditorSession helpers throw on
// non-2xx with the body's `error` field as message; we assert on that
// propagated message.
//
// What this locks in:
//   - storage PUT failures ARE surfaced (silent in the happy-path test)
//   - /complete failures ARE surfaced
//   - PATCH failures (session CAS-loss / in-progress conflict) ARE
//     surfaced
//   - publish POST failures (YouTube 502) ARE surfaced
//   - The dialog's catch-block guard stops the integration BEFORE
//     publishEditorSession is fired when an upstream step throws
//     (this is the runtime mirror of "assenza di Blob blocca il
//     publish" -- if no asset ID was produced by uploadMediaAsset,
//     or the PATCH was refused, the dialog must not POST publish)
//   - uploadMediaAsset fails synchronously on null/undefined Blob
//     BEFORE any network call (today via V8 property-access TypeError
//     on `blob.type`; future explicit guards should keep this green
//     by throwing TypeError or updating the assertion to match the
//     new error class)
//
// Each test installs a controlled fetch mock so the assertion
// focuses on a single failure path. The mocks intentionally mirror
// bff.publishFlow.test.ts's URL-classified dispatch (so the new test
// reads like a damaged sibling of the happy-path suite, not a
// separate integration).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';

import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff/upload';
import { publishEditorSession } from '@/lib/api/bff/youtube';

if (!globalThis.crypto?.subtle) {
    (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

// Minimal document with a string-cookie getter/setter. bffFetch reads
// `document.cookie` to attach the csrf_token to non-GET requests; the
// BFF helpers in this file all hit non-GET endpoints so a cookie-mock
// is required for the bffFetch path to even attempt the request.
//
// IMPORTANT: the backing string MUST live in a closure variable, not
// in a property of the same descriptor target. Reading `doc.cookie` via
// a getter that returns `doc.cookie` would infinite-recurse and throw
// "Maximum call stack size exceeded" the first time bffFetch reads the
// cookie.
function installDomCookieMock(): void {
    const g = globalThis as unknown as { document?: { cookie: string } };
    let backing = 'csrf_token=test-csrf';
    const doc = {
        get cookie(): string {
            return backing;
        },
        set cookie(v: string) {
            const parts = v.split(';')[0].split('=');
            const name = parts[0];
            const value = parts.slice(1).join('=');
            const cookies = backing
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean);
            const existingIdx = cookies.findIndex((s) => s.startsWith(name + '='));
            if (existingIdx >= 0) {
                cookies[existingIdx] = name + '=' + value;
            } else {
                cookies.push(name + '=' + value);
            }
            backing = cookies.join('; ');
        },
    };
    g.document = doc as unknown as { cookie: string };
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    installDomCookieMock();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('publish pipeline error paths', () => {
    it('uploadMediaAsset surfaces a storage PUT 5xx (presign OK, PUT 503 -> "Storage upload failed: 503")', async () => {
        // The storage PUT is wrapped by a plain `fetch(...)` (NOT
        // bffFetch) so the error string format is `Storage upload
        // failed: <status> <statusText>` rather than the body's
        // `error` field. This test pins that surface so a future
        // refactor that wraps PUT in bffFetch doesn't silently drop
        // the message.
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
                const requestUrl = String(url);
                if (requestUrl.includes('/api/v1/media/presign')) {
                    return new Response(
                        JSON.stringify({
                            asset_id: 'asset-123',
                            upload_url: 'https://s3.example/up',
                            upload_method: 'PUT',
                            upload_headers: {},
                        }),
                        { status: 200, headers: { 'content-type': 'application/json' } },
                    );
                }
                if (requestUrl === 'https://s3.example/up') {
                    return new Response('', { status: 503 });
                }
                return new Response('Not Found', { status: 404 });
            }),
        );

        const blob = new Blob(['png-bytes'], { type: 'image/png' });
        await expect(uploadMediaAsset(blob, 'thumb.png')).rejects.toThrow(
            /Storage upload failed: 503/,
        );
    });

    it('uploadMediaAsset surfaces a POST /complete 5xx (presign+PUT OK, complete 503 propagates body.error)', async () => {
        // After presign + PUT succeeded the orchestrator stamps the
        // asset finalised by POSTing /api/v1/media/{id}/complete.
        // A 5xx there (DB down, transient) MUST propagate through
        // bffFetch with the body's `error` field -- otherwise the
        // dialog would silently treat the upload as successful.
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
                const requestUrl = String(url);
                if (requestUrl.includes('/api/v1/media/presign')) {
                    return new Response(
                        JSON.stringify({
                            asset_id: 'asset-123',
                            upload_url: 'https://s3.example/up',
                            upload_method: 'PUT',
                            upload_headers: {},
                        }),
                        { status: 200, headers: { 'content-type': 'application/json' } },
                    );
                }
                if (requestUrl === 'https://s3.example/up') {
                    return new Response('', { status: 200 });
                }
                if (requestUrl.includes('/api/v1/media/asset-123/complete')) {
                    return new Response(
                        JSON.stringify({ error: 'media-complete: db temporarily unavailable' }),
                        { status: 503, headers: { 'content-type': 'application/json' } },
                    );
                }
                return new Response('Not Found', { status: 404 });
            }),
        );

        const blob = new Blob(['png-bytes'], { type: 'image/png' });
        await expect(uploadMediaAsset(blob, 'thumb.png')).rejects.toThrow(
            /media-complete: db temporarily unavailable/,
        );
    });

    it('updateEditorSessionThumbnail surfaces a PATCH 409 (session CAS-loss / publish already in progress)', async () => {
        // The shared resolver in InstaeditLogin's
        // executePublishYouTubeEditorSession returns
        // errAttachSessionNotEditable (mapped to HTTP 409) when
        // AttachThumbnail CAS-losses because the session row's
        // status moved to 'publishing' or 'published' between the
        // upload completing and the PATCH arriving. The dark editor
        // MUST surface this so its catch-block can re-render the
        // publish button as "retry" rather than "publishing...".
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                return new Response(
                    JSON.stringify({ error: 'editor session is not in an editable state' }),
                    {
                        status: 409,
                        headers: { 'content-type': 'application/json' },
                    },
                );
            }),
        );

        await expect(updateEditorSessionThumbnail('proj-1', 'asset-123')).rejects.toThrow(
            /editor session is not in an editable state/,
        );
    });

    it('publishEditorSession surfaces a publish POST 502 (YouTube api failure propagates body.error)', async () => {
        // The InstaeditLogin publish orchestrator maps a non-2xx
        // response from thumbnails.set + videos.update into a 502
        // Bad Gateway with the original YouTube error in the
        // `error` field. The dark editor's BFF must surface that
        // field verbatim so the toast UI shows the operator-friendly
        // text instead of a generic "HTTP 502".
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                return new Response(
                    JSON.stringify({
                        error:
                            'youtube publish failed: thumbnails.set 503 backend temporarily unavailable',
                    }),
                    {
                        status: 502,
                        headers: { 'content-type': 'application/json' },
                    },
                );
            }),
        );

        await expect(
            publishEditorSession('proj-1', {
                title: 'Test title',
                privacy_status: 'public',
            }),
        ).rejects.toThrow(/youtube publish failed: thumbnails\.set 503/);
    });

    it('integration cascade: a 409 from updateEditorSessionThumbnail prevents publishEditorSession from being called', async () => {
        // The dialog's catch-block guard stops the pipeline BEFORE
        // publishing when ANY upstream step throws. This test is the
        // runtime mirror of "assenza di Blob blocca il publish":
        //   - uploadMediaAsset succeeds (asset ID produced)
        //   - updateEditorSessionThumbnail fails with 409 (no asset
        //     was linked to the session in the CAS sense, or the
        //     session row's status moved to 'publishing' / 'published'
        //     concurrently)
        //   - publishEditorSession MUST NOT be reachable from this
        //     cycle; otherwise the dialog would 502 on a sequence
        //     that the orchestrator already considers terminal.
        //
        // The simplest unit-level mirror: invoke the integration in
        // try/{publish} block; assert publishEditorSession's URL is
        // absent from the captured fetch call sequence AND the loop
        // surface an error classifyable by the dialog as "retry".
        const calls: string[] = [];
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
                const requestUrl = String(url);
                calls.push(requestUrl);

                if (requestUrl.includes('/api/v1/media/presign')) {
                    return new Response(
                        JSON.stringify({
                            asset_id: 'asset-xyz',
                            upload_url: 'https://s3.example/up',
                            upload_method: 'PUT',
                            upload_headers: {},
                        }),
                        { status: 200, headers: { 'content-type': 'application/json' } },
                    );
                }
                if (requestUrl === 'https://s3.example/up') {
                    return new Response('', { status: 200 });
                }
                if (requestUrl.includes('/complete')) {
                    return new Response(JSON.stringify({ id: 'asset-xyz' }), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }
                // PATCH /by-project/{id} returns 409.
                if (requestUrl.includes('/by-project/') && !requestUrl.endsWith('/publish')) {
                    return new Response(
                        JSON.stringify({ error: 'publish already in progress' }),
                        {
                            status: 409,
                            headers: { 'content-type': 'application/json' },
                        },
                    );
                }
                return new Response('Not Found', { status: 404 });
            }),
        );

        const blob = new Blob(['png-bytes'], { type: 'image/png' });
        // If `await publishEditorSession(...)` is ever reached, the
        // assertion below will trip because the captured `calls` array
        // will contain a URL ending in `/publish`. The .rejects.toThrow
        // assertion additionally locks the surfaced-409 message.
        await expect(
            (async () => {
                const assetId = await uploadMediaAsset(blob, 'thumb.png');
                await updateEditorSessionThumbnail('proj-1', assetId);
                await publishEditorSession('proj-1', { title: 't' });
            })(),
        ).rejects.toThrow(/publish already in progress/);

        expect(
            calls.some((c) => c.endsWith('/publish')),
            'no fetch call should reach the publish endpoint after the 409 on PATCH',
        ).toBe(false);

        // Sanity: the failed-PATCH URL is in the captured sequence.
        const patchCall = calls.find((c) => c.includes('/by-project/proj-1'));
        expect(patchCall).toBeDefined();
    });
});

describe('publish pipeline -- dialog-level guard backstop', () => {
    it('uploadMediaAsset throws synchronously on a null / undefined Blob BEFORE issuing any network call (lock for case 12: no Blob => no publish)', async () => {
        // The dialog's primary "no Blob => no publish" guard is at the
        // render level (the publish button is disabled when blob is
        // null). This test pins a SECOND defensive backstop at the
        // BFF level: uploadMediaAsset fails synchronously on a null /
        // undefined payload rather than silently PUT 0 bytes to
        // /media/presign and poison the downstream state with a 400
        // that the dialog would then confuse with a YouTube failure.
        //
        // Rationale: if a future caller passes `null` (e.g. a React
        // stale-state ref read or an asynchronous-unmount race), the
        // TypeError raised by `blob.type` access surfaces BEFORE the
        // uploadMediaAsset function schedules its bffFetch -- so the
        // dialog's catch-block sees a meaningful error and the publish
        // cascade is provably halted (because publishEditorSession
        // depends on a valid asset_id that uploadMediaAsset never
        // produced).
        const fetchStub = vi.fn(async () =>
            new Response('{}', {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );
        vi.stubGlobal('fetch', fetchStub);

        // Lock: today this is a V8 property-access TypeError from
        // `blob.type` on a null/undefined receiver. A future refactor
        // that adds an explicit null guard (e.g. `if (!blob) throw new
        // Error('no blob')`) MUST either keep this assertion green by
        // throwing a TypeError (or subclass) or update the assertion
        // to match the new error class. Don't leave this ambiguous.
        await expect(
            uploadMediaAsset(null as unknown as Blob, 'null.png'),
        ).rejects.toThrow(TypeError);

        await expect(
            uploadMediaAsset(undefined as unknown as Blob, 'undefined.png'),
        ).rejects.toThrow(TypeError);

        // The strict behavioural lock: zero fetch calls were issued.
        // A regression that wraps the null-check in a deferred
        // Promise.resolve().then() (so the error surfaces AFTER fetch
        // was scheduled) would now FAIL this assertion.
        expect(
            fetchStub,
            'uploadMediaAsset must NOT hit the network for a null/undefined blob -- otherwise the dialog-level "no publish" guard has a leak',
        ).not.toHaveBeenCalled();
    });
});
