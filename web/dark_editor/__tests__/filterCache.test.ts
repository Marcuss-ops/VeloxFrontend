import { describe, it, expect, beforeEach } from 'vitest';
import { FilterCache } from '@/lib/filterCache';

function makeImageData(): ImageData {
  const data = new Uint8ClampedArray(4);
  return { data, width: 1, height: 1 } as ImageData;
}

describe('FilterCache', () => {
  let cache: FilterCache;

  beforeEach(() => {
    cache = new FilterCache(1); // 1MB max
  });

  it('returns null for a missing entry', () => {
    expect(cache.get('img', 'blur', { value: 1 })).toBeNull();
  });

  it('stores and retrieves an entry', () => {
    const imageData = makeImageData();
    cache.set('img', 'blur', { value: 1 }, imageData);
    expect(cache.get('img', 'blur', { value: 1 })).toBe(imageData);
  });

  it('tracks cache hits and misses', () => {
    cache.get('img', 'blur', { value: 1 });
    cache.set('img', 'blur', { value: 1 }, makeImageData());
    cache.get('img', 'blur', { value: 1 });
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('evicts oldest entry when size limit is exceeded', () => {
    const large = { data: new Uint8ClampedArray(2 * 1024 * 1024), width: 1, height: 1 } as ImageData;
    cache.set('img1', 'blur', { value: 1 }, large);
    expect(cache.has('img1', 'blur', { value: 1 })).toBe(true);
    cache.set('img2', 'blur', { value: 1 }, large);
    expect(cache.has('img1', 'blur', { value: 1 })).toBe(false);
    expect(cache.has('img2', 'blur', { value: 1 })).toBe(true);
  });

  it('clears all entries', () => {
    cache.set('img', 'blur', { value: 1 }, makeImageData());
    cache.clear();
    expect(cache.get('img', 'blur', { value: 1 })).toBeNull();
    expect(cache.getStats().entries).toBe(0);
  });

  it('clears entries for a specific image', () => {
    cache.set('img1', 'blur', { value: 1 }, makeImageData());
    cache.set('img2', 'blur', { value: 1 }, makeImageData());
    cache.clearImage('img1');
    expect(cache.get('img1', 'blur', { value: 1 })).toBeNull();
    expect(cache.get('img2', 'blur', { value: 1 })).not.toBeNull();
  });
});
