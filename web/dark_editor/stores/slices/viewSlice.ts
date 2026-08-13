// stores/slices/viewSlice.ts — Canvas view state (document size, zoom and
// pan offset) and its actions. Extracted from stores/editorStore.ts so the
// registry stays a pure composition point.

import type { StoreApi } from 'zustand';
import type { EditorState } from '../editorStore';

export interface ViewSlice {
  // Canvas view state
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;

  // Canvas view actions
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
}

export const createViewSlice = (
  set: StoreApi<EditorState>['setState'],
  _get: StoreApi<EditorState>['getState']
): ViewSlice => ({
  canvasWidth: 1920,
  canvasHeight: 1080,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,

  setCanvasSize: (width, height) => {
    set({ canvasWidth: width, canvasHeight: height });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setOffset: (x, y) => {
    set({ offsetX: x, offsetY: y });
  },
});
