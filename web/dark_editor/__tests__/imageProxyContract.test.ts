import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isImageProxyHost } from '@/lib/image-proxy-allowlist';
import { proxyToGo } from '@/lib/api-proxy';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('image proxy allowlist (shared contract)', () => {
  it('accepts the YouTube thumbnail CDNs the client proxies', () => {
    expect(isImageProxyHost('i.ytimg.com')).toBe(true);
    expect(isImageProxyHost('img.youtube.com')).toBe(true);
    expect(isImageProxyHost('www.youtube.com')).toBe(true);
    expect(isImageProxyHost('youtube.com')).toBe(true);
  });

  it('rejects hosts the proxy must never fetch', () => {
    expect(isImageProxyHost('example.com')).toBe(false);
    expect(isImageProxyHost('ytimg.com.evil.io')).toBe(false);
    expect(isImageProxyHost('notytimg.com')).toBe(false);
    expect(isImageProxyHost('')).toBe(false);
  });

  it('keeps the server route and the client helper on the same allowlist', () => {
    // The client URL helper and the server route must both delegate to the
    // shared predicate — if they ever diverge again, a client-generated
    // proxy URL can deterministically 403 server-side.
    const serverRoute = read('app/api/image-proxy/route.ts');
    const clientHelper = read('lib/api/httpClient.ts');

    expect(serverRoute).toContain("from '@/lib/image-proxy-allowlist'");
    expect(serverRoute).toContain('isImageProxyHost(target.hostname)');
    expect(clientHelper).toContain("from '@/lib/image-proxy-allowlist'");
    expect(clientHelper).toContain('isImageProxyHost(hostname)');
    // No inline regex duplicates left on either side.
    expect(serverRoute).not.toContain('ALLOWED_HOST');
    expect(clientHelper).not.toContain("endsWith('ytimg.com')");
  });
});

describe('proxyToGo (byte-safe body passthrough)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it('passes a binary body through without text re-serialization', async () => {
    const response = await proxyToGo('/api/v1/drive/assets/abc/content');

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    // PNG magic bytes — would be mangled by response.text() round-trip.
    expect(Array.from(bytes)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  it('still proxies JSON bodies correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const response = await proxyToGo('/api/v1/editor/launch');
    expect(await response.json()).toEqual({ ok: true });
  });
});
