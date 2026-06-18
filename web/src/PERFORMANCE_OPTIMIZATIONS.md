# Performance Optimization Guide

## Overview

This guide shows how to apply the performance optimizations to existing components.

## Files Created

### Hooks
- `src/hooks/useDebouncedValue.ts` - Debounce values and callbacks
- `src/hooks/useTabVisibility.ts` - Track tab visibility and window focus

### Utilities
- `src/lib/selectors.ts` - Memoized selectors for derived state
- `src/lib/dataCache.ts` - Shared data cache to prevent refetching

### Components
- `src/components/ui/VirtualizedList.tsx` - Lightweight virtualization
- `src/components/ui/LazyLoad.tsx` - Lazy loading for heavy components

---

## 1. Apply Debounce to Search Inputs

### Before (DriveImporter.tsx)
```tsx
const [searchQuery, setSearchQuery] = useState('');

const filteredFiles = searchQuery
  ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  : files;
```

### After
```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { selectFilteredFiles } from '@/lib/selectors';

const [searchQuery, setSearchQuery] = useState('');
const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

// Use useMemo with selector
const filteredFiles = useMemo(
  () => selectFilteredFiles(files, debouncedSearchQuery),
  [files, debouncedSearchQuery]
);
```

**Benefit**: Filtering runs 300ms after user stops typing instead of on every keystroke.

---

## 2. Apply Debounce to YouTubeChannelsApp Search

### Before
```tsx
const [searchTerm, setSearchTerm] = useState('');

const filteredChannels = channels.filter(ch =>
  ch.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### After
```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { selectFilteredChannels } from '@/lib/selectors';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

const filteredChannels = useMemo(
  () => selectFilteredChannels(channels, debouncedSearchTerm),
  [channels, debouncedSearchTerm]
);
```

---

## 3. Tab Visibility Pause for Polling

### Already Implemented!

The `useJobDetailPolling` hook now includes:
- ✅ Pauses polling when tab is hidden
- ✅ Exponential backoff on errors (2s, 4s, 8s, ... max 5min)
- ✅ Request overlap prevention (no concurrent requests)
- ✅ Stops after max retries (default: 5)

### Usage
```tsx
const { isPolling, errorCount, currentBackoff } = useJobDetailPolling({
  job,
  onRefresh: refreshJob,
  autoRefresh: true,
  refreshInterval: 5000,
  maxRetries: 5,
});

// Show backoff info to user
if (errorCount > 0) {
  console.log(`Polling error #${errorCount}, next attempt in ${currentBackoff}ms`);
}
```

---

## 4. Memoized Selectors

### Before (expensive derivations inline)
```tsx
function DriveImporter() {
  const folderCount = files.filter(f => f.type === 'folder').length;
  const videoCount = files.filter(f => f.type === 'file').length;
  const selectedFiles = files.filter(f => selectedIds.has(f.id) && f.type === 'file');
  
  return <div>{folderCount} folders, {videoCount} videos</div>;
}
```

### After (with selectors + useMemo)
```tsx
import { useMemo } from 'react';
import {
  selectFolderCount,
  selectVideoCount,
  selectSelectedFiles,
} from '@/lib/selectors';

function DriveImporter() {
  const folderCount = useMemo(() => selectFolderCount(files), [files]);
  const videoCount = useMemo(() => selectVideoCount(files), [files]);
  const selectedFiles = useMemo(
    () => selectSelectedFiles(files, selectedIds),
    [files, selectedIds]
  );
  
  return <div>{folderCount} folders, {videoCount} videos</div>;
}
```

**Benefit**: Calculations only run when dependencies change, not on every render.

---

## 5. Shared Data Cache

### Before (refetching on every mount)
```tsx
useEffect(() => {
  youtubeApi.channels(false).then(setChannels);
}, []);
```

### After (cached with TTL)
```tsx
import { dataCache } from '@/lib/dataCache';

useEffect(() => {
  const loadChannels = async () => {
    const channels = await dataCache.get(
      'channels',
      () => youtubeApi.channels(false),
      { ttl: 5 * 60 * 1000 }  // 5 minutes
    );
    setChannels(channels);
  };
  
  loadChannels();
}, []);
```

**Benefit**: Channels cached for 5 minutes, prevents redundant API calls.

### Invalidate cache when needed
```tsx
// After adding/removing a channel
dataCache.invalidate('channels');
```

---

## 6. Virtualization for Long Lists

### Before (renders all items)
```tsx
<div className="space-y-2">
  {channels.map(channel => (
    <ChannelCard key={channel.id} channel={channel} />
  ))}
</div>
```

### After (only renders visible items)
```tsx
import { VirtualizedList } from '@/components/ui/VirtualizedList';

<VirtualizedList
  items={channels}
  itemHeight={80}
  containerHeight={400}
  renderItem={(channel) => (
    <ChannelCard key={channel.id} channel={channel} />
  )}
/>
```

**Benefit**: With 1000 channels, only renders ~10 visible items instead of all 1000.

---

## 7. Lazy Loading Heavy Components

### Before (loads everything upfront)
```tsx
import YouTubeChannelsApp from './YouTubeChannelsApp';

function App() {
  return (
    <Routes>
      <Route path="/youtube" element={<YouTubeChannelsApp />} />
    </Routes>
  );
}
```

### After (lazy loads on demand)
```tsx
import { createLazyComponent } from '@/components/ui/LazyLoad';

const YouTubeChannelsApp = createLazyComponent(
  () => import('./YouTubeChannelsApp')
);

function App() {
  return (
    <Routes>
      <Route path="/youtube" element={<YouTubeChannelsApp />} />
    </Routes>
  );
}
```

**Benefit**: YouTubeChannelsApp (2449 lines) only loads when user navigates to /youtube.

---

## 8. Normalize State Shape

### Before (nested arrays)
```tsx
interface State {
  groups: Array<{
    name: string;
    channels: Array<{
      id: string;
      name: string;
      // ...
    }>;
  }>;
}

// Finding a channel requires nested iteration
const channel = groups
  .flatMap(g => g.channels)
  .find(ch => ch.id === channelId);
```

### After (normalized maps)
```tsx
interface State {
  channelsById: Record<string, Channel>;
  groupIds: string[];
  groupsById: Record<string, Group>;
}

// O(1) channel lookup
const channel = state.channelsById[channelId];
```

**Benefit**: Constant-time lookups instead of O(n) iteration.

---

## Priority Order

1. **Quick Wins (30 min)**
   - ✅ Debounce search inputs
   - ✅ Memoize expensive selectors
   
2. **Medium Impact (1-2 hours)**
   - ✅ Tab visibility for polling
   - ✅ Shared data cache
   
3. **High Impact (2-4 hours)**
   - ✅ Virtualization for long lists
   - ✅ Lazy loading heavy components
   
4. **Architecture (requires refactoring)**
   - Normalize state shape
   - Remove cascading useEffects

---

## Testing

Run tests to verify optimizations:

```bash
npm test
```

All existing tests should pass. New tests added for:
- `useDebouncedValue.test.ts` - Debounce timing
- `selectors.test.ts` - Selector correctness
- `useJobDetailPolling.test.ts` - Tab visibility, backoff

---

## Metrics to Track

Before/after optimization:

1. **React DevTools Profiler**
   - Rerender count per input keystroke
   - Time spent on render
   
2. **Network Tab**
   - Duplicate API requests
   - Request frequency
   
3. **Performance Tab**
   - Initial load time
   - Time to interactive
   
4. **User Experience**
   - Search responsiveness
   - Scroll smoothness
   - Modal open speed
