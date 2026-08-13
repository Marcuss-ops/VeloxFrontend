import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST = /(^|\.)ytimg\.com$/i;

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

  if (target.protocol !== 'https:' || !ALLOWED_HOST.test(target.hostname)) {
    return NextResponse.json({ error: 'image host is not allowed' }, { status: 403 });
  }

  try {
    let upstream = await fetch(target, {
      headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
      next: { revalidate: 3600 },
    });

    // maxresdefault is not generated for every YouTube video. Fall back to
    // the guaranteed hqdefault variant instead of leaving a broken canvas
    // image when the session contains a stale max-resolution URL.
    if (!upstream.ok && upstream.status === 404) {
      const videoId = target.pathname.match(/\/vi\/([^/]+)\//)?.[1];
      if (videoId) {
        upstream = await fetch(`https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`, {
          headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
          next: { revalidate: 3600 },
        });
      }
    }
    if (!upstream.ok) {
      // Some YouTube IDs have no generated thumbnail at all (deleted or
      // private videos). Return a real image response so the canvas does not
      // keep a broken <img> and the browser console stays clean.
      const fallbackSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#111827"/><rect x="48" y="48" width="1184" height="624" rx="28" fill="#1f2937" stroke="#475569" stroke-width="6"/><path d="M540 255h200v150H540z" fill="#64748b"/><circle cx="590" cy="305" r="18" fill="#cbd5e1"/><circle cx="650" cy="305" r="18" fill="#cbd5e1"/><circle cx="710" cy="305" r="18" fill="#cbd5e1"/><text x="640" y="500" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="38" text-anchor="middle">Thumbnail non disponibile</text></svg>';
      return new NextResponse(fallbackSvg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'upstream response is not an image' }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'thumbnail proxy failed' }, { status: 502 });
  }
}
