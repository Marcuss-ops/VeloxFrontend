// @vitest-environment jsdom
//
// Protection test for the crop logic extracted from Canvas.tsx into
// useCanvasCrop: pins the draft initialization (full-size for free crop,
// centered 1:1 for square/circle) and the relative-to-previous-crops
// commit math (nextCropRect must not stretch the aspect ratio).

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCanvasCrop } from '@/hooks/useCanvasCrop';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

const makeImage = (overrides: Partial<ImageObject> = {}): ImageObject => ({
  id: 'img-1',
  type: 'image',
  x: 100,
  y: 100,
  width: 400,
  height: 200,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  visible: true,
  locked: false,
  name: 'image',
  src: 'https://example.com/a.png',
  ...overrides,
});

const hookArgs = (stageRef: { current: null }) => ({
  stageRef,
  displayScale: 1,
  displayOffsetX: 0,
  displayOffsetY: 0,
  isPanning: false,
});

beforeEach(() => {
  useEditorStore.getState().clearCanvas();
  useUIStore.getState().cancelCropEditing();
});

describe('useCanvasCrop', () => {
  it('initializes a full-size draft for free crop and commits a sub-rect relative to previous crops', () => {
    act(() => {
      useEditorStore.getState().addObject(makeImage());
      useUIStore.getState().startCropEditing('img-1', 'free');
    });

    const stageRef = { current: null };
    const { result } = renderHook(() => useCanvasCrop(hookArgs(stageRef)));

    expect(result.current.cropTarget?.id).toBe('img-1');
    expect(result.current.cropDraft).toEqual({ x: 0, y: 0, width: 400, height: 200 });

    act(() => {
      result.current.setCropDraft({ x: 50, y: 50, width: 200, height: 100 });
    });

    act(() => {
      result.current.commitCrop();
    });

    const obj = useEditorStore.getState().objects['img-1'];
    expect(obj).toMatchObject({
      x: 150, // 100 + 50 * scaleX(1)
      y: 150,
      width: 200,
      height: 100,
      // relative to the previous full-image cropRect (0,0,1,1)
      cropRect: { x: 50 / 400, y: 50 / 200, width: 200 / 400, height: 100 / 200 },
      cropMode: 'free',
    });
    expect(useUIStore.getState().cropEditingId).toBeNull();
    expect(useUIStore.getState().activeTool).toBe('select');
  });

  it('initializes a centered 1:1 draft for square crop and commits it', () => {
    act(() => {
      useEditorStore.getState().addObject(makeImage());
      useUIStore.getState().startCropEditing('img-1', 'square');
    });

    const stageRef = { current: null };
    const { result } = renderHook(() => useCanvasCrop(hookArgs(stageRef)));

    // 400x200 → maximum centered 1:1 area
    expect(result.current.cropDraft).toEqual({ x: 100, y: 0, width: 200, height: 200 });

    act(() => {
      result.current.commitCrop();
    });

    const obj = useEditorStore.getState().objects['img-1'];
    expect(obj).toMatchObject({
      x: 200, // 100 + 100 * scaleX(1)
      y: 100,
      width: 200,
      height: 200,
      cropRect: { x: 100 / 400, y: 0, width: 200 / 400, height: 200 / 200 },
      cropMode: 'square',
    });
  });

  it('compounds the cropRect on top of an existing crop (no aspect stretching)', () => {
    act(() => {
      useEditorStore.getState().addObject(
        makeImage({ cropRect: { x: 0.1, y: 0.2, width: 0.5, height: 0.5 } })
      );
      useUIStore.getState().startCropEditing('img-1', 'free');
    });

    const stageRef = { current: null };
    const { result } = renderHook(() => useCanvasCrop(hookArgs(stageRef)));

    act(() => {
      result.current.setCropDraft({ x: 100, y: 50, width: 200, height: 100 });
    });
    act(() => {
      result.current.commitCrop();
    });

    const obj = useEditorStore.getState().objects['img-1'];
    expect(obj?.cropRect).toEqual({
      x: 0.1 + (100 / 400) * 0.5,
      y: 0.2 + (50 / 200) * 0.5,
      width: (200 / 400) * 0.5,
      height: (100 / 200) * 0.5,
    });
  });
});
