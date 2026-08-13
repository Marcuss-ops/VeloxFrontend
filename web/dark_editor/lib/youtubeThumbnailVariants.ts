// lib/youtubeThumbnailVariants.ts — Pure YouTube thumbnail variant chain.
//
// YouTube only guarantees `default.jpg` (120x90) for every processed
// video; the larger variants (maxres/sd/hq/mq) are generated on demand
// and may 404 for videos without a custom thumbnail, freshly processed
// uploads, or private/unlisted videos. The image proxy walks this chain
// (plus the originally requested URL) before serving a neutral
// placeholder, so a single missing or CDN-refused variant never leaves
// the editor canvas with a broken image.

export const YOUTUBE_THUMBNAIL_VARIANTS = [
  'maxresdefault.jpg',
  'sddefault.jpg',
  'hqdefault.jpg',
  'mqdefault.jpg',
  'default.jpg',
] as const;

/** True when the URL points at a /vi/{videoId}/ YouTube thumbnail. */
export function isYouTubeThumbnailUrl(url: URL): boolean {
  return /^\/vi\/[^/]+\//.test(url.pathname);
}

/**
 * Extract the video id from a YouTube thumbnail URL, or '' when the URL
 * is not a /vi/{videoId}/ thumbnail (channel avatars, storyboard frames,
 * etc. — those are never rewritten).
 */
export function youtubeVideoIdFromThumbnailUrl(url: URL): string {
  const match = url.pathname.match(/^\/vi\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Standard variant URLs for a YouTube thumbnail URL, from the largest
 * (maxresdefault) to the always-present (default). Empty when the URL is
 * not a /vi/{videoId}/ thumbnail. The video id is decoded back into the
 * chain so an id with percent-encoding round-trips cleanly.
 */
export function youtubeThumbnailVariants(url: URL): string[] {
  const videoId = youtubeVideoIdFromThumbnailUrl(url);
  if (!videoId) return [];
  const encoded = encodeURIComponent(videoId);
  return YOUTUBE_THUMBNAIL_VARIANTS.map(
    (variant) => `https://i.ytimg.com/vi/${encoded}/${variant}`,
  );
}
