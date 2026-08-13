// lib/canvasCaptureGeometry.ts — Shared stage-transform geometry for
// overlay-free logical-rectangle captures. Both lib/canvasExport.ts and
// lib/canvasPreview.ts neutralize pan/zoom and per-layer transforms before
// rendering the document, then restore them; this module is the single
// source for that snapshot / neutralize / restore dance so the two callers
// can't drift.
//
// The type surface is intentionally structural and minimal: Konva.Stage
// (real, from canvasExport) and ExportStage (the mock, from canvasPreview)
// both satisfy it.

export interface CaptureNode {
  x?: () => number;
  y?: () => number;
  scaleX?: () => number;
  scaleY?: () => number;
  rotation?: (value?: number) => number | void;
  position?: (position?: { x: number; y: number }) => unknown;
  scale?: (scale?: { x: number; y: number }) => unknown;
}

export interface CaptureStage extends CaptureNode {
  width?: () => number;
  height?: () => number;
  size?: (size?: { width: number; height: number }) => unknown;
  find?: (selector: string) => CaptureNode[];
}

export interface LayerTransformSnapshot {
  node: CaptureNode;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface StageTransformSnapshot {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  width?: number;
  height?: number;
  layers: LayerTransformSnapshot[];
}

/** Collect the current transform of every child Layer (pan/zoom/rotation). */
export function collectLayerTransforms(stage: CaptureStage): LayerTransformSnapshot[] {
  return (stage.find?.('Layer') ?? [])
    .filter((node) => node.x && node.y && node.scaleX && node.scaleY && node.rotation)
    .map((node) => ({
      node,
      x: node.x!(),
      y: node.y!(),
      scaleX: node.scaleX!(),
      scaleY: node.scaleY!(),
      rotation: node.rotation!() ?? 0,
    }));
}

/** Capture the stage + layer transforms and backing size for later restore. */
export function snapshotStageTransforms(stage: CaptureStage): StageTransformSnapshot {
  return {
    x: stage.x?.() ?? 0,
    y: stage.y?.() ?? 0,
    scaleX: stage.scaleX?.() ?? 1,
    scaleY: stage.scaleY?.() ?? 1,
    width: stage.width?.(),
    height: stage.height?.(),
    layers: collectLayerTransforms(stage),
  };
}

/** Resize to the logical rectangle and reset stage + layer transforms. */
export function neutralizeStageTransforms(
  stage: CaptureStage,
  width: number,
  height: number,
  layers: LayerTransformSnapshot[],
): void {
  stage.size?.({ width, height });
  for (const { node } of layers) {
    node.position?.({ x: 0, y: 0 });
    node.scale?.({ x: 1, y: 1 });
    node.rotation?.(0);
  }
  stage.position?.({ x: 0, y: 0 });
  stage.scale?.({ x: 1, y: 1 });
}

/** Restore the stage + layer transforms and backing size from a snapshot. */
export function restoreStageTransforms(stage: CaptureStage, snapshot: StageTransformSnapshot): void {
  stage.position?.({ x: snapshot.x, y: snapshot.y });
  stage.scale?.({ x: snapshot.scaleX, y: snapshot.scaleY });
  for (const { node, x, y, scaleX, scaleY, rotation } of snapshot.layers) {
    node.position?.({ x, y });
    node.scale?.({ x: scaleX, y: scaleY });
    node.rotation?.(rotation);
  }
  if (snapshot.width != null && snapshot.height != null) {
    stage.size?.({ width: snapshot.width, height: snapshot.height });
  }
}
