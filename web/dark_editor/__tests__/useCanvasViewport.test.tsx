// @vitest-environment jsdom
//
// Unit tests for useCanvasViewport: pins the fit/display geometry math
// (fit scale, letterboxing offsets and the zoom/offset multipliers) without
// a real ResizeObserver.

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { useEditorStore } from '@/stores/editorStore';

class MockResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  useEditorStore.getState().setCanvasSize(1920, 1080);
  useEditorStore.getState().setZoom(1);
  useEditorStore.getState().setOffset(0, 0);
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useCanvasViewport', () => {
  it('fits the 1920x1080 document into the container and applies zoom/offset', () => {
    useEditorStore.getState().setZoom(2);
    useEditorStore.getState().setOffset(10, -20);
    const containerRef = { current: { clientWidth: 960, clientHeight: 540 } } as unknown as React.RefObject<HTMLDivElement>;

    const { result } = renderHook(() => useCanvasViewport(containerRef));

    expect(result.current.viewportSize).toEqual({ width: 960, height: 540 });
    expect(result.current.fitScale).toBeCloseTo(0.5); // min(960/1920, 540/1080)
    expect(result.current.displayScale).toBeCloseTo(1); // 0.5 * 2
    expect(result.current.fitOffsetX).toBeCloseTo(0); // (960 - 1920*0.5) / 2
    expect(result.current.fitOffsetY).toBeCloseTo(0);
    expect(result.current.displayOffsetX).toBeCloseTo(10); // fitOffsetX + offsetX
    expect(result.current.displayOffsetY).toBeCloseTo(-20); // fitOffsetY + offsetY
  });

  it('letterboxes a non-16:9 container so the document stays centered', () => {
    const containerRef = { current: { clientWidth: 1920, clientHeight: 2160 } } as unknown as React.RefObject<HTMLDivElement>;

    const { result } = renderHook(() => useCanvasViewport(containerRef));

    // fitScale is limited by the height ratio: min(1920/1920, 2160/1080) = 1
    expect(result.current.fitScale).toBeCloseTo(1);
    expect(result.current.fitOffsetX).toBeCloseTo(0);
    expect(result.current.fitOffsetY).toBeCloseTo(540); // (2160 - 1080*1) / 2
  });
});
