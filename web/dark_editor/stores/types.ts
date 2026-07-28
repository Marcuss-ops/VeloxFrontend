// Canonical type definitions for the dark_editor Zustand stores.
// Kept here so that the per-slice modules can type their StateCreator against
// the combined state without circular imports.

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
  // Censorship & Translation
  censoredText?: string;
  useCensorship?: boolean;
  // Focus/Defocus & Pixelation
  blur?: number;
  sharpen?: number;
  pixelation?: number;
  // Advanced Text Effects
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
  // Shape & Image Effects
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
  // Image Fills for Clipping Masks
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
  processing?: boolean;
};

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'color' | 'image' | 'number';
  defaultValue: string | number;
  placeholder?: string;
}

export interface TemplateCondition {
  id: string;
  variableId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'complete' | 'text' | 'dynamic';
  objects: CanvasObject[];
  variables?: TemplateVariable[];
  conditions?: TemplateCondition[];
  previewUrl?: string;
  createdAt: number;
  updatedAt: number;
  category?: string;
  tags?: string[];
}