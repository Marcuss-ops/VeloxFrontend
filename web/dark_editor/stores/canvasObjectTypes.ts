/**
 * Canvas object domain model. Every layer the editor renders is one of the
 * five kinds below, discriminated on `type` — each kind only carries the
 * fields it actually uses (no more flat optional-field primitive obsession).
 *
 * This module is the single source of truth for the domain types; the store
 * registry (stores/editorStore.ts) re-exports them for back-compat and the
 * slices (stores/slices/*) import them directly.
 */

export type ObjectKind = 'image' | 'text' | 'rect' | 'circle' | 'shape';

/**
 * Fields shared by every canvas object kind. Only genuinely cross-kind
 * properties live here (geometry, transform, visibility and the styling /
 * effect fields the editor applies to any kind); kind-specific fields live
 * on the member interfaces below.
 */
export interface BaseCanvasObject {
  id: string;
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
  // Shared optional effect/styling fields (applied to any object kind)
  processing?: boolean;
  blur?: number; // Blur intensity (0 = no effect)
  sharpen?: number; // Sharpen intensity (0 = no effect)
  pixelation?: number; // Pixel size (0 = no effect)
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // NEW: Image Fills for Clipping Masks (text + markers + images)
  imageFill?: {
    src: string;
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  dropShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
  };
  texture?: {
    type: 'none' | 'noise' | 'grain' | 'paper' | 'metal';
    intensity: number;
  };
  shapeGradient?: {
    type: 'linear' | 'radial';
    angle: number;
    colors: string[];
  };
}

export interface ImageObject extends BaseCanvasObject {
  type: 'image';
  src: string;
  cropMode?: 'free' | 'square' | 'circle' | 'lasso';
  cropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cropPathPoints?: number[];
  feather?: number;
}

export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text: string;
  /** When false this text layer is kept verbatim in translated variants. */
  translate?: boolean;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  fontWeight?: string;
  allCaps?: boolean;
  backgroundFill?: string;
  backgroundOpacity?: number;
  padding?: number;
  // NEW: Censorship & Translation
  censoredText?: string; // Censored version of text
  useCensorship?: boolean; // Toggle censorship on/off
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
}

export interface RectObject extends BaseCanvasObject {
  type: 'rect';
}

export interface CircleObject extends BaseCanvasObject {
  type: 'circle';
}

export interface ShapeObject extends BaseCanvasObject {
  type: 'shape';
}

/**
 * A canvas layer. Discriminated on `type`: each kind only carries the
 * fields it actually uses, eliminating the previous flat type where every
 * object declared every optional field (primitive obsession).
 */
export type CanvasObject = ImageObject | TextObject | RectObject | CircleObject | ShapeObject;

/**
 * Union of every field across all canvas-object kinds — a superset of
 * `keyof CanvasObject` (which only yields the keys common to every kind).
 * Used by update helpers that let the UI edit kind-specific fields.
 */
export type CanvasObjectField =
  | keyof ImageObject
  | keyof TextObject
  | keyof RectObject
  | keyof CircleObject
  | keyof ShapeObject;

export function isImageObject(obj: CanvasObject): obj is ImageObject {
  return obj.type === 'image';
}

export function isTextObject(obj: CanvasObject): obj is TextObject {
  return obj.type === 'text';
}

export function isMarkerObject(obj: CanvasObject): obj is RectObject | CircleObject | ShapeObject {
  return obj.type === 'rect' || obj.type === 'circle' || obj.type === 'shape';
}
