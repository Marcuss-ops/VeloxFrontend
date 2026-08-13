import { describe, expect, it } from 'vitest';
import {
  isYouTubeThumbnailUrl,
  youtubeVideoIdFromThumbnailUrl,
  youtubeThumbnailVariants,
} from '@/lib/youtubeThumbnailVariants';

describe('youtubeThumbnailVariants', () => {
  it('builds the standard variant chain from a /vi/{id}/ URL', () => {
    const variants = youtubeThumbnailVariants(new URL('https://i.ytimg.com/vi/abc123/hqdefault.jpg'));
    expect(variants).toEqual([
      'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
      'https://i.ytimg.com/vi/abc123/sddefault.jpg',
      'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      'https://i.ytimg.com/vi/abc123/mqdefault.jpg',
      'https://i.ytimg.com/vi/abc123/default.jpg',
    ]);
  });

  it('works for the img.youtube.com host and percent-encoded ids', () => {
    const variants = youtubeThumbnailVariants(new URL('https://img.youtube.com/vi/a%20b/default.jpg'));
    expect(variants[0]).toBe('https://i.ytimg.com/vi/a%20b/maxresdefault.jpg');
    expect(variants[variants.length - 1]).toBe('https://i.ytimg.com/vi/a%20b/default.jpg');
  });

  it('returns an empty chain for non-video thumbnail URLs (channel avatars, playlists)', () => {
    expect(youtubeThumbnailVariants(new URL('https://yt3.ggpht.com/avatar123=s88'))).toEqual([]);
    expect(youtubeThumbnailVariants(new URL('https://www.youtube.com/watch?v=abc'))).toEqual([]);
  });

  it('identifies /vi/{id}/ thumbnail URLs', () => {
    expect(isYouTubeThumbnailUrl(new URL('https://i.ytimg.com/vi/abc/mqdefault.jpg'))).toBe(true);
    expect(isYouTubeThumbnailUrl(new URL('https://yt3.ggpht.com/avatar'))).toBe(false);
    expect(youtubeVideoIdFromThumbnailUrl(new URL('https://i.ytimg.com/vi/abc/hqdefault.jpg'))).toBe('abc');
    expect(youtubeVideoIdFromThumbnailUrl(new URL('https://yt3.ggpht.com/avatar'))).toBe('');
  });
});
