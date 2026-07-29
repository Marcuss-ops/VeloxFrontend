// Canvas element pool for the Dark Editor effect renderers.
//
// Module-private CanvasPool class + a single, lazily-acquired
// singleton. The class never escapes this file; consumers must use
// the exported `canvasPool` instance so all HTMLCanvasElement
// allocations funnel through the same acquisition/release loop.
//
// Originally co-located with TextEffectsRenderer +
// ShapeEffectsRenderer in lib/advancedEffects.ts; extracted here so
// that future renderers (and the planned Phase-3 split into
// web Workers / OffscreenCanvas) can depend on the pool without
// pulling in the heavier renderer code paths.

class CanvasPool {
  private pool: HTMLCanvasElement[] = [];

  acquire(): HTMLCanvasElement {
    return this.pool.shift() || document.createElement('canvas');
  }

  release(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.pool.push(canvas);
  }
}

export const canvasPool = new CanvasPool();
