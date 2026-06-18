// Filter Cache System
// Caches filter results to avoid redundant calculations

export interface CacheKey {
  imageId: string;        // Unique identifier for the source image
  filterType: string;     // Type of filter applied
  params: string;         // JSON-serialized filter parameters
  sourceHash?: string;    // Optional hash of source data
}

export interface CacheEntry {
  key: CacheKey;
  result: ImageData;
  timestamp: number;
  size: number;           // Size in bytes
}

export class FilterCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;  // Max cache size in bytes
  private currentSize: number = 0;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSizeMB: number = 100) {
    this.maxSize = maxSizeMB * 1024 * 1024;
  }

  // Generate a cache key from filter options
  generateKey(
    imageId: string, 
    filterType: string, 
    params: Record<string, unknown>
  ): string {
    const key: CacheKey = {
      imageId,
      filterType,
      params: JSON.stringify(params),
    };
    return `${key.imageId}:${key.filterType}:${key.params}`;
  }

  // Get cached result
  get(imageId: string, filterType: string, params: Record<string, unknown>): ImageData | null {
    const key = this.generateKey(imageId, filterType, params);
    const entry = this.cache.get(key);
    
    if (entry) {
      this.hits++;
      // Move to front (LRU)
      entry.timestamp = Date.now();
      return entry.result;
    }
    
    this.misses++;
    return null;
  }

  // Store result in cache
  set(
    imageId: string, 
    filterType: string, 
    params: Record<string, unknown>, 
    result: ImageData
  ): void {
    const key = this.generateKey(imageId, filterType, params);
    const size = result.data.byteLength;
    
    // Evict old entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }
    
    // Remove existing entry if present
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }
    
    // Add new entry
    this.cache.set(key, {
      key: { imageId, filterType, params: JSON.stringify(params) },
      result,
      timestamp: Date.now(),
      size,
    });
    this.currentSize += size;
  }

  // Evict oldest entry (LRU)
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }
    
    if (oldest) {
      const entry = this.cache.get(oldest);
      if (entry) {
        this.currentSize -= entry.size;
        this.cache.delete(oldest);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  // Clear cache for specific image
  clearImage(imageId: string): void {
    for (const [key, entry] of this.cache) {
      if (key.includes(`${imageId}:`)) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    entries: number;
    sizeMB: number;
    maxSizeMB: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    return {
      entries: this.cache.size,
      sizeMB: Math.round(this.currentSize / (1024 * 1024) * 100) / 100,
      maxSizeMB: this.maxSize / (1024 * 1024),
      hitRate: this.hits + this.misses > 0 
        ? Math.round((this.hits / (this.hits + this.misses)) * 100) / 100 
        : 0,
      hits: this.hits,
      misses: this.misses,
    };
  }

  // Check if cache has entry
  has(imageId: string, filterType: string, params: Record<string, unknown>): boolean {
    const key = this.generateKey(imageId, filterType, params);
    return this.cache.has(key);
  }
}

// Singleton instance
export const filterCache = new FilterCache(100); // 100MB default