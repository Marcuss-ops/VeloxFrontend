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

// Convenience wrappers (applyTextShadow / applyTextStroke /
// applyTextGradient / applyTextCurve / applyDropShadow /
// applyShapeGradient / applyTexture) live in
// lib/effects/appliers.ts. The wildcard re-export below forwards
// them so any legacy `@/lib/advancedEffects` consumer keeps the
// same import surface.
//
// After commits 1–5 of this refactor, advancedEffects.ts itself
// carries no render code path: it is a structural barrel that
// names where the seven sub-modules live so a maintainer can find
// the moving parts without grepping. New code should import
// directly from `@/lib/effects/<sub-module>` (or
// `@/lib/effects/appliers` for the wrapper-only call surface).
//
// Sunset clause: once the legacy `@/lib/advancedEffects` callers
// migrate to direct `@/lib/effects/<sub-module>` imports
// (REFACTOR_PLAN §3.3), this file can be deleted entirely.
export * from './effects/appliers';