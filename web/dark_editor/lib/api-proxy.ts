import { NextResponse } from 'next/server';
import { HOP_BY_HOP } from '@/lib/youtube/client';

const GO_API_BASE = process.env.DARK_EDITOR_API_BASE ?? 'http://localhost:8000';

export async function proxyToGo(path: string, init: RequestInit = {}): Promise<NextResponse> {
  try {
    const requestHeaders = new Headers(init.headers);
    const requestCookie = init.headers instanceof Headers
      ? init.headers.get('cookie')
      : undefined;
    if (requestCookie && !requestHeaders.has('cookie')) requestHeaders.set('cookie', requestCookie);
    const response = await fetch(`${GO_API_BASE}${path}`, {
      cache: 'no-store',
      ...init,
      headers: requestHeaders,
    });
    // Pass the upstream body through UNCHANGED (stream, not text): reading
    // .text() and re-serializing corrupts binary payloads (PNG/JPEG/WebP/
    // ZIP/video) that the generic proxy carries — most notably Drive asset
    // content_url responses.
    const responseHeaders: Record<string, string> = { 'cache-control': 'no-store', pragma: 'no-cache' };
    response.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      responseHeaders[key.toLowerCase()] = value;
    });
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch (err) {
    console.warn(`[proxy] backend unreachable for ${path}:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: 'backend_unreachable' },
      { status: 503 }
    );
  }
}
