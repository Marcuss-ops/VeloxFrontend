// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff/upload';
import { publishEditorSession } from '@/lib/api/bff/youtube';

if (!globalThis.crypto?.subtle) {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

describe('publish flow integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploads thumbnail, attaches it to the session, and publishes', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, init: init as RequestInit });

        if (requestUrl.includes('/api/v1/media/presign')) {
          return new Response(
            JSON.stringify({
              asset_id: 'asset-xyz',
              upload_url: 'https://s3.example/up',
              upload_method: 'PUT',
              upload_headers: {},
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }

        if (requestUrl === 'https://s3.example/up') {
          return new Response('', { status: 200 });
        }

        if (requestUrl.includes('/api/v1/media/asset-xyz/complete')) {
          return new Response(JSON.stringify({ id: 'asset-xyz' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (requestUrl.includes('/api/v1/youtube/editor-sessions/by-project/proj-1') && init?.method === 'PATCH') {
          return new Response('', { status: 204 });
        }

        if (requestUrl.endsWith('/publish')) {
          return new Response(
            JSON.stringify({
              public_url: 'https://youtu.be/vid',
              video_id: 'vid',
              privacy_status: 'public',
              status: 'published',
              actual_privacy: 'public',
              youtube_sync_status: 'confirmed',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }

        return new Response('Not Found', { status: 404 });
      })
    );

    const blob = new Blob(['png-bytes'], { type: 'image/png' });

    // 1. Upload thumbnail to InstaEdit media storage.
    const assetId = await uploadMediaAsset(blob, 'thumb.png');
    expect(assetId).toBe('asset-xyz');

    // 2. Attach the uploaded asset to the editor session.
    await updateEditorSessionThumbnail('proj-1', assetId);
    const patchCall = calls.find(
      (c) => c.url.includes('/by-project/proj-1') && c.init?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    expect(patchCall!.init!.body).toBe(JSON.stringify({ thumbnail_media_id: assetId }));

    // 3. Publish the editor session to YouTube.
    const result = await publishEditorSession('proj-1', {
      title: 'Test title',
      privacy_status: 'public',
    });
    expect(result.status).toBe('published');
    expect(result.actual_privacy).toBe('public');
    expect(result.youtube_sync_status).toBe('confirmed');

    // Verify the exact outbound sequence.
    const sequence = calls.map((c) => `${c.init?.method ?? 'GET'} ${c.url}`);
    expect(sequence).toEqual([
      'POST /api/v1/media/presign',
      'PUT https://s3.example/up',
      'POST /api/v1/media/asset-xyz/complete',
      'PATCH /api/v1/youtube/editor-sessions/by-project/proj-1',
      'POST /api/v1/youtube/editor-sessions/by-project/proj-1/publish',
    ]);
  });
});
