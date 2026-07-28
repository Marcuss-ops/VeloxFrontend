// Advanced Effects Utilities
// Handles text and shape effects rendering

// Effect interfaces (TextShadow, TextStroke, TextGradient,
// TextCurve, DropShadow, ShapeGradient, Texture) live in
// lib/effects/types.ts. We import them here so the function
// signatures below can reference them locally (the `export * from`
// re-export does NOT bind names into local scope — same TS2304
// footgun we caught in api.ts commits 1 + 5). The `export *`
// statement then forwards the same set to any caller still using
// `@/lib/advancedEffects`. New code should import directly from
// `@/lib/effects/<sub-module>`.
import type {
  TextShadow,
  TextStroke,
  TextGradient,
  TextCurve,
  DropShadow,
  ShapeGradient,
  Texture,
} from './effects/types';

export * from './effects/types';

// canvasPool singleton lives in lib/effects/canvasPool.ts — the
// two renderer classes below still reference it via the import
// below, and `export *` forwards it to anyone using the legacy
// `@/lib/advancedEffects` import surface.
import { canvasPool } from './effects/canvasPool';
export * from './effects/canvasPool';

// TextEffectsRenderer + textEffectsRenderer singleton live in
// lib/effects/textEffects.ts — the 4 text convenience functions
// (applyTextShadow, applyTextStroke, applyTextGradient,
// applyTextCurve) still reference the singleton via the import
// below, and `export *` forwards both the class and the singleton
// to anyone using the legacy `@/lib/advancedEffects` import surface.
import { textEffectsRenderer } from './effects/textEffects';
export * from './effects/textEffects';

// ShapeEffectsRenderer + shapeEffectsRenderer singleton live in
// lib/effects/shapeEffects.ts — the 3 shape convenience functions
// (applyDropShadow, applyShapeGradient, applyTexture) still
// reference the singleton via the import below, and `export *`
// forwards both the class and the singleton to anyone using the
// legacy `@/lib/advancedEffects` import surface.
import { shapeEffectsRenderer } from './effects/shapeEffects';
export * from './effects/shapeEffects';

// Convenience functions
export function applyTextShadow(text: string, font: string, color: string, shadow: TextShadow): HTMLCanvasElement {
  return textEffectsRenderer.applyTextShadow(text, font, color, shadow);
}

export function applyTextStroke(text: string, font: string, color: string, stroke: TextStroke): HTMLCanvasElement {
  return textEffectsRenderer.applyTextStroke(text, font, color, stroke);
}

export function applyTextGradient(text: string, font: string, gradient: TextGradient): HTMLCanvasElement {
  return textEffectsRenderer.applyTextGradient(text, font, gradient);
}

export function applyTextCurve(text: string, font: string, color: string, curve: TextCurve): HTMLCanvasElement {
  return textEffectsRenderer.applyTextCurve(text, font, color, curve);
}

export function applyDropShadow(width: number, height: number, fill: string, shadow: DropShadow): HTMLCanvasElement {
  return shapeEffectsRenderer.applyDropShadow(width, height, fill, shadow);
}

export function applyShapeGradient(width: number, height: number, gradient: ShapeGradient): HTMLCanvasElement {
  return shapeEffectsRenderer.applyShapeGradient(width, height, gradient);
}

export function applyTexture(width: number, height: number, fill: string, texture: Texture): HTMLCanvasElement {
  return shapeEffectsRenderer.applyTexture(width, height, fill, texture);
}