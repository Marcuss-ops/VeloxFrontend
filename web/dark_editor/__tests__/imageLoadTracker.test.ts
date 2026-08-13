import { describe, expect, it, beforeEach } from 'vitest';
import {
  isImageSrcFailed,
  markImageLoadFailed,
  markImageLoadSucceeded,
  resetImageLoadTracker,
} from '@/lib/imageLoadTracker';

describe('imageLoadTracker', () => {
  beforeEach(() => {
    resetImageLoadTracker();
  });

  it('starts clean', () => {
    expect(isImageSrcFailed('https://i.ytimg.com/vi/abc/hqdefault.jpg')).toBe(false);
  });

  it('records and clears failures', () => {
    const src = 'https://i.ytimg.com/vi/abc/hqdefault.jpg';
    markImageLoadFailed(src);
    expect(isImageSrcFailed(src)).toBe(true);

    markImageLoadSucceeded(src);
    expect(isImageSrcFailed(src)).toBe(false);
  });

  it('ignores empty sources and never fails unrelated srcs', () => {
    markImageLoadFailed('https://broken.example/thumb.jpg');
    expect(isImageSrcFailed(undefined)).toBe(false);
    expect(isImageSrcFailed('')).toBe(false);
    expect(isImageSrcFailed('https://other.example/ok.jpg')).toBe(false);
  });
});
