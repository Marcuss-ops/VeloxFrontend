import { NextRequest, NextResponse } from 'next/server';
import { isImageProxyHost } from '@/lib/image-proxy-allowlist';
import { youtubeThumbnailVariants } from '@/lib/youtubeThumbnailVariants';
import { neutralThumbnailSvg } from '@/lib/thumbnailFallback';

// Browser-like request context. YouTube's CDN can answer 403 to bare
// server-side fetches (bot detection) while serving the very same image
// to a browser User-Agent; the Referer mimics an embed so the request is
// not treated as a hotlink.
const UPSTREAM_HEADERS = {
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Referer: 'https://www.youtube.com/',
};

async function fetchImage(url: URL): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: UPSTREAM_HEADERS,
      // Never let the Next data cache pin a refused variant for an hour:
      // the CDN layer caches successful image responses below, failures
      // must stay re-tryable.
      cache: 'no-store',
    });
    if (!response.ok) {
      response.body?.cancel().catch(() => undefined);
      return null;
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      response.body?.cancel().catch(() => undefined);
      return null;
    }
    return response;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: 'image url is required' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'invalid image url' }, { status: 400 });
  }

  if (target.protocol !== 'https:' || !isImageProxyHost(target.hostname)) {
    return NextResponse.json({ error: 'image host is not allowed' }, { status: 403 });
  }

  // maxresdefault is not generated for every YouTube video (and the CDN
  // can 403 a variant that the browser would serve). Walk the standard
  // variant chain before giving up, so a single missing or refused
  // variant never leaves a broken canvas image. Non-thumbnail assets
  // (channel avatars, etc.) keep their original URL as the only candidate.
  const seen = new Set<string>();
  let upstream: Response | null = null;
  for (const candidate of [target.toString(), ...youtubeThumbnailVariants(target)]) {
    const normalized = candidate.split('#')[0];
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    upstream = await fetchImage(new URL(normalized));
    if (upstream) break;
  }

  if (!upstream) {
    // No public thumbnail exists for this video (deleted or private) or
    // the CDN refused every variant. Serve a clean neutral placeholder —
    // never a branded "thumbnail not available" message — so the canvas
    // and any exported cover stay clean. no-store: a transient refusal
    // must not be pinned by the CDN for minutes.
    return new NextResponse(neutralThumbnailSvg(), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
