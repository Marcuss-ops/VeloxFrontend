import { useRef } from 'react';
import { DataCache } from '@/lib/dataCache';

/**
 * Returns a local DataCache instance for the calling component/hook.
 * The instance is stable across renders, so cached entries and pending
 * request deduplication persist for the lifetime of the component.
 */
export function useDataCache(): DataCache {
    const cacheRef = useRef<DataCache | null>(null);
    if (cacheRef.current === null) {
        cacheRef.current = new DataCache();
    }
    return cacheRef.current;
}
