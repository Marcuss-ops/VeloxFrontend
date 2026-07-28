// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import { uploadMediaAsset } from '@/lib/api/bff/upload';

if (!globalThis.crypto?.subtle) {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

describe('uploadMediaAsset', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects blobs larger than 2 MB before any network request', async () => {
    const huge = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)]);
    await expect(uploadMediaAsset(huge, 'huge.png')).rejects.toThrow(
      'Thumbnail exceeds 2 MB limit.'
    );
  });

  it('rejects unsupported MIME types', async () => {
    const gif = new Blob(['GIF89a'], { type: 'image/gif' });
    await expect(uploadMediaAsset(gif, 'thumb.gif')).rejects.toThrow(
      'Unsupported thumbnail format. Only JPEG and PNG are allowed.'
    );
  });

  it('performs presign -> PUT storage -> complete in order', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, init: init as RequestInit });

        if (requestUrl.includes('/api/v1/media/presign')) {
          return new Response(
            JSON.stringify({
              asset_id: 'asset-123',
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

        if (requestUrl.includes('/api/v1/media/asset-123/complete')) {
          return new Response(JSON.stringify({ id: 'asset-123' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        return new Response('Not Found', { status: 404 });
      })
    );

    const blob = new Blob(['png-bytes'], { type: 'image/png' });
    const assetId = await uploadMediaAsset(blob, 'thumb.png');

    expect(assetId).toBe('asset-123');
    expect(calls).toHaveLength(3);
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].url).toContain('/api/v1/media/presign');
    expect(calls[1].init?.method).toBe('PUT');
    expect(calls[1].url).toBe('https://s3.example/up');
    expect(calls[2].init?.method).toBe('POST');
    expect(calls[2].url).toContain('/api/v1/media/asset-123/complete');
  });
});
