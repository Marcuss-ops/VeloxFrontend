// Effect type definitions for the Dark Editor canvas renderer.
//
// INVARIANT: this module is types-only. Do not add runtime `export const`
// or `export function` here — `lib/advancedEffects.ts` re-exports this
// file via `export *`, which would silently leak any runtime value
// through every consumer of `@/lib/advancedEffects`. If you ever need
// a runtime constant, put it in `lib/effects/canvasPool.ts` (or a
// similarly-named module that does not participate in the wildcard
// re-export chain).
//
// Leaf module — zero dependencies. Pure interfaces that describe the
// shape of effect parameters consumed by textEffects.ts,
// shapeEffects.ts, and the convenience wrappers in appliers.ts.
// Originally co-located with the renderer classes in
// lib/advancedEffects.ts; extracted here so that the heavy
// canvas-bound renderer code (which spawns live HTMLCanvasElement
// instances at module load time) does not have to be evaluated to
// pull in just the type contract from a static type-checker pass.

// ------------------------------------------------------------------
// Text effects
// ------------------------------------------------------------------

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface TextStroke {
  width: number;
  color: string;
}

export interface TextGradient {
  type: 'linear' | 'radial';
  angle: number;
  colors: string[];
}

export interface TextCurve {
  enabled: boolean;
  radius: number;
  direction: 'up' | 'down';
}

// ------------------------------------------------------------------
// Shape effects
// ------------------------------------------------------------------

export interface DropShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

export interface ShapeGradient {
  type: 'linear' | 'radial';
  angle: number;
  colors: string[];
}

export interface Texture {
  type: 'none' | 'noise' | 'grain' | 'paper' | 'metal';
  intensity: number;
}
