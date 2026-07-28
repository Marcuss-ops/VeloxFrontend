// Effect convenience wrappers (appliers).
//
// 7 stateless one-liner functions that delegate to the
// textEffectsRenderer + shapeEffectsRenderer singletons. These are
// the public call surface every editor component reaches for paint
// operations \u2014 they add zero logic on top of the singletons; they
// exist purely so call sites import a name without touching the
// renderer class directly.
//
// Originally co-located with the renderer classes +
// singletons in lib/advancedEffects.ts; extracted here so the
// renderer code path is not pulled into bundles that only need
// the simple wrapper surface (when this is wired into a worker
// boundary the wrappers can stay in the editor thread while the
// renderers move to an OffscreenCanvas worker).

import { textEffectsRenderer } from './textEffects';
import { shapeEffectsRenderer } from './shapeEffects';
import type {
  TextShadow,
  TextStroke,
  TextGradient,
  TextCurve,
  DropShadow,
  ShapeGradient,
  Texture,
} from './types';

// ------------------------------------------------------------------
// Text wrappers
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Shape wrappers
// ------------------------------------------------------------------

export function applyDropShadow(width: number, height: number, fill: string, shadow: DropShadow): HTMLCanvasElement {
  return shapeEffectsRenderer.applyDropShadow(width, height, fill, shadow);
}

export function applyShapeGradient(width: number, height: number, gradient: ShapeGradient): HTMLCanvasElement {
  return shapeEffectsRenderer.applyShapeGradient(width, height, gradient);
}

export function applyTexture(width: number, height: number, fill: string, texture: Texture): HTMLCanvasElement {
  return shapeEffectsRenderer.applyTexture(width, height, fill, texture);
}
