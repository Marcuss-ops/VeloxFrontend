/**
 * Shared Data Cache
 * 
 * Lightweight cache to prevent refetching the same data across multiple components.
 * Alternative to TanStack Query for simple use cases.
 * 
 * Features:
 * - Time-based expiration (TTL)
 * - Manual invalidation
 * - Request deduplication (prevents concurrent identical requests)
 * 
 * @example
 * ```tsx
 * // In a hook or component
 * const channels = useCache('channels', () => youtubeApi.channels(), { ttl: 5 * 60 * 1000 });
 * ```
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;  // Time to live in milliseconds
};

type PendingRequest<T> = Promise<T>;



export interface CacheOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to enable cache (default: true) */
  enabled?: boolean;
  /** Custom cache key prefix */
  prefix?: string;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();


  /**
   * Get data from cache or fetch it
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = DEFAULT_TTL,
      enabled = true,
      prefix = '',
    } = options;

    const cacheKey = prefix ? `${prefix}:${key}` : key;

    // If cache disabled, always fetch
    if (!enabled) {
      return fetcher();
    }

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && this.isFresh(cached)) {
      return cached.data as T;
    }

    // Check if request is already pending (deduplication)
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }

    // Fetch and cache
    const request = this.fetchAndCache(cacheKey, fetcher, ttl);
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Get data synchronously (returns null if not cached)
   */
  getSync<T>(key: string, options: CacheOptions = {}): T | null {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isFresh(cached)) {
      return cached.data as T;
    }
    
    return null;
  }

  /**
   * Manually invalidate cache entry
   */
  invalidate(key: string, options: CacheOptions = {}): void {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries matching prefix
   */
  invalidatePrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${prefix}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }



  // Private methods

  private isFresh(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private async fetchAndCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const data = await fetcher();
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    return data;
  }

}

// Singleton instance
export const dataCache = new DataCache();

export default dataCache;
