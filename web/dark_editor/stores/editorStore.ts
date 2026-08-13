import { create } from 'zustand';
import { enablePatches } from 'immer';
import { createObjectSlice, type ObjectSlice } from './slices/objectSlice';
import { createHistorySlice, type HistorySlice } from './slices/historySlice';
import { createEffectsSlice, type EffectsSlice } from './slices/effectsSlice';

enablePatches();

export type CanvasObject = {
  id: string;
  type: 'image' | 'text' | 'rect' | 'circle' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  name: string;
  // Type-specific properties
  src?: string; // for images
  text?: string; // for text
  /** When false this text layer is kept verbatim in translated variants. */
  translate?: boolean;
  fill?: string; // for shapes
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  fontWeight?: string;
  allCaps?: boolean;
  backgroundFill?: string;
  backgroundOpacity?: number;
  padding?: number;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
  // NEW: Censorship & Translation
  censoredText?: string; // Censored version of text
  useCensorship?: boolean; // Toggle censorship on/off
  // NEW: Focus/Defocus & Pixelation
  blur?: number; // Blur intensity (0 = no effect)
  sharpen?: number; // Sharpen intensity (0 = no effect)
  pixelation?: number; // Pixel size (0 = no effect)

  // NEW: Advanced Text Effects
  textShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textStroke?: {
    width: number;
    color: string;
  };
  textGradient?: {
    type: 'linear' | 'radial';
    angle: number;
    colors: string[];
  };
  textCurve?: {
    enabled: boolean;
    radius: number;
    direction: 'up' | 'down';
  };

  // NEW: Shape & Image Effects
  dropShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
  };
  borderRadius?: number;
  shapeGradient?: {
    type: 'linear' | 'radial';
    angle: number;
    colors: string[];
  };
  texture?: {
    type: 'none' | 'noise' | 'grain' | 'paper' | 'metal';
    intensity: number;
  };
  // NEW: Image Fills for Clipping Masks
  imageFill?: {
    src: string;
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  cropMode?: 'free' | 'square' | 'circle' | 'lasso';
  cropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cropPathPoints?: number[];
  feather?: number;
  processing?: boolean; // NEW: Processing state for AI actions
};

/**
 * Composed editor store. The implementation lives in the cohesive slices
 * under stores/slices/ (objectSlice: CRUD + selection + clipboard +
 * layering; historySlice: undo/redo + immer patch machinery; effectsSlice:
 * filters + text/shape effects). This file is the registry/composition
 * point: it defines the CanvasObject domain type, the canvas view state
 * and how the slices are merged into the single store the UI subscribes to.
 *
 * Note: `removeBackground` no longer lives here — the network I/O belongs
 * to the application layer, see lib/backgroundRemoval.ts.
 */
export interface EditorState extends ObjectSlice, HistorySlice, EffectsSlice {
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

export const useEditorStore = create<EditorState>((set, get) => ({
  // Slice state + actions (spread order is irrelevant — no key overlaps)
  ...createObjectSlice(set, get),
  ...createHistorySlice(set, get),
  ...createEffectsSlice(set, get),

  // Canvas view state
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
}));

/** Ordered projection kept here for callers of the legacy array store. */
export function getObjectsArrayFromState(
  objects: Record<string, CanvasObject>,
  objectIds: string[],
): CanvasObject[] {
  return objectIds
    .map((id) => objects[id])
    .filter((object): object is CanvasObject => Boolean(object));
}
