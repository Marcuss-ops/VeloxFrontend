import { NextResponse } from 'next/server';
import { HOP_BY_HOP } from '@/lib/youtube/client';

const GO_API_BASE = process.env.DARK_EDITOR_API_BASE ?? 'http://localhost:8000';

export async function proxyToGo(path: string, init: RequestInit = {}): Promise<NextResponse> {
  try {
    const response = await fetch(`${GO_API_BASE}${path}`, { cache: 'no-store', ...init });
    const body = await response.text();
    const headers: Record<string, string> = { 'cache-control': 'no-store', pragma: 'no-cache' };
    response.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      headers[key.toLowerCase()] = value;
    });
    return new NextResponse(body, { status: response.status, headers });
  } catch (err) {
    console.warn(`[proxy] backend unreachable for ${path}:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: 'backend_unreachable' },
      { status: 503 }
    );
  }
}

