// stores/types.ts — CanvasObject domain type. Extracted from
// stores/editorStore.ts (commit 1/4 of the editor-store-slices refactor
// series). Lives at the top of stores/ so the slice files can import
// the type without a circular dependency through editorStore.ts (which
// wraps the slice creators).

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
