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
 * - Subscribe to cache updates
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

type Subscriber<T> = (data: T | null) => void;

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
  private subscribers = new Map<string, Set<Subscriber<any>>>();

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
    this.notifySubscribers(cacheKey, null);
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
      this.notifySubscribers(key, null);
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.subscribers.clear();
  }

  /**
   * Subscribe to cache updates
   */
  subscribe<T>(
    key: string,
    subscriber: Subscriber<T>,
    options: CacheOptions = {}
  ): () => void {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    
    if (!this.subscribers.has(cacheKey)) {
      this.subscribers.set(cacheKey, new Set());
    }
    
    this.subscribers.get(cacheKey)!.add(subscriber);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(cacheKey);
      if (subs) {
        subs.delete(subscriber);
      }
    };
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats(): { size: number; pending: number; subscribers: number } {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size,
      subscribers: this.subscribers.size,
    };
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

    this.notifySubscribers(cacheKey, data);
    
    return data;
  }

  private notifySubscribers<T>(cacheKey: string, data: T | null): void {
    const subs = this.subscribers.get(cacheKey);
    if (subs) {
      subs.forEach(sub => sub(data));
    }
  }
}

// Singleton instance
export const dataCache = new DataCache();

/**
 * React hook for using cached data
 * 
 * @param key - Cache key
 * @param fetcher - Function to fetch data
 * @param options - Cache options
 * @returns Cached data and loading state
 * 
 * @example
 * ```tsx
 * const { data, loading, error } = useCachedData(
 *   'channels',
 *   () => youtubeApi.channels(false),
 *   { ttl: 5 * 60 * 1000 }
 * );
 * ```
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): { data: T | null; loading: boolean; error: Error | null } {
  // Note: This is a simplified version
  // For production, consider using TanStack Query
  throw new Error(
    'useCachedData is not yet implemented. ' +
    'Use dataCache.get() directly or integrate TanStack Query.'
  );
}

export default dataCache;
