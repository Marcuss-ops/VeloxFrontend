/**
 * VirtualizedList Component
 * 
 * Lightweight virtualization for long lists (channels, files, feed items).
 * Only renders visible items to improve performance with large datasets.
 * 
 * Alternative to react-window/react-virtualized for simple use cases.
 * 
 * @example
 * ```tsx
 * <VirtualizedList
 *   items={channels}
 *   itemHeight={60}
 *   containerHeight={400}
 *   renderItem={(channel) => <ChannelCard key={channel.id} channel={channel} />}
 * />
 * ```
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface VirtualizedListProps<T> {
  /** Items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Additional CSS class for container */
  className?: string;
  /** Overscan count (items to render outside visible area) */
  overscanCount?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscanCount = 3,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    const overscanStart = Math.max(0, start - overscanCount);
    const overscanEnd = Math.min(items.length, start + visibleCount + overscanCount);
    
    return {
      start: overscanStart,
      end: overscanEnd,
      totalHeight: items.length * itemHeight,
      offsetY: overscanStart * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscanCount]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Visible items
  const visibleItems = useMemo(() => {
    const itemsToRender: React.ReactNode[] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      itemsToRender.push(renderItem(items[i], i));
    }
    
    return itemsToRender;
  }, [items, visibleRange, renderItem]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: visibleRange.totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${visibleRange.offsetY}px)` }}>
          {visibleItems}
        </div>
      </div>
    </div>
  );
}

/**
 * VirtualizedGrid Component
 * 
 * Virtualization for grid layouts (folder grids, channel grids).
 * 
 * @example
 * ```tsx
 * <VirtualizedGrid
 *   items={files}
 *   itemHeight={120}
 *   itemWidth={200}
 *   containerHeight={400}
 *   containerWidth={800}
 *   columns={3}
 *   renderItem={(file) => <FolderCard key={file.id} file={file} />}
 * />
 * ```
 */

export interface VirtualizedGridProps<T> {
  /** Items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Width of each item in pixels */
  itemWidth: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Number of columns */
  columns: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Additional CSS class for container */
  className?: string;
  /** Overscan count */
  overscanCount?: number;
}

export function VirtualizedGrid<T>({
  items,
  itemHeight,
  itemWidth,
  containerHeight,
  columns,
  renderItem,
  className = '',
  overscanCount = 2,
}: VirtualizedGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const rows = Math.ceil(items.length / columns);
    const startRow = Math.floor(scrollTop / itemHeight);
    const visibleRows = Math.ceil(containerHeight / itemHeight);
    
    const overscanStart = Math.max(0, startRow - overscanCount);
    const overscanEnd = Math.min(rows, startRow + visibleRows + overscanCount);
    
    return {
      startRow: overscanStart,
      endRow: overscanEnd,
      totalHeight: rows * itemHeight,
      offsetY: overscanStart * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, columns, overscanCount]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Visible items
  const visibleItems = useMemo(() => {
    const itemsToRender: React.ReactNode[] = [];
    
    for (let row = visibleRange.startRow; row < visibleRange.endRow; row++) {
      const startIndex = row * columns;
      const endIndex = Math.min(startIndex + columns, items.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        itemsToRender.push(renderItem(items[i], i));
      }
    }
    
    return itemsToRender;
  }, [items, visibleRange, columns, renderItem]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: visibleRange.totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${visibleRange.offsetY}px)` }}>
          {visibleItems}
        </div>
      </div>
    </div>
  );
}

/**
 * useVirtualization Hook
 * 
 * Hook for custom virtualization logic
 * 
 * @param totalItems - Total number of items
 * @param itemSize - Size of each item
 * @param containerSize - Size of container
 * @param overscan - Overscan count
 * @returns Visible range and offset
 */
export function useVirtualization(
  totalItems: number,
  itemSize: number,
  containerSize: number,
  overscan: number = 3
) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollOffset / itemSize);
    const visibleCount = Math.ceil(containerSize / itemSize);
    
    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(totalItems, start + visibleCount + overscan);
    
    return {
      start: overscanStart,
      end: overscanEnd,
      totalSize: totalItems * itemSize,
      offset: overscanStart * itemSize,
    };
  }, [scrollOffset, itemSize, containerSize, totalItems, overscan]);

  return {
    scrollOffset,
    setScrollOffset,
    visibleRange,
  };
}

export default VirtualizedList;
