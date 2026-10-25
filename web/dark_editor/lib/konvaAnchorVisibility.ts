import type Konva from 'konva';

/**
 * Keep resize handles inside the Stage viewport when a selected object reaches
 * a clipped canvas edge. Konva centers its handles on the object's bounds by
 * default, which hides half of a full-bleed image's handles at the Stage edge.
 */
export function keepTransformerAnchorsInsideStage(anchor: Konva.Rect): void {
  const stage = anchor.getStage();
  if (!stage) return;

  const position = anchor.absolutePosition();
  const scale = anchor.getAbsoluteScale();
  const halfWidth = (anchor.width() * Math.abs(scale.x)) / 2;
  const halfHeight = (anchor.height() * Math.abs(scale.y)) / 2;

  if (position.x < halfWidth) {
    anchor.offsetX(0);
  } else if (position.x > stage.width() - halfWidth) {
    anchor.offsetX(anchor.width());
  } else {
    anchor.offsetX(anchor.width() / 2);
  }

  if (position.y < halfHeight) {
    anchor.offsetY(0);
  } else if (position.y > stage.height() - halfHeight) {
    anchor.offsetY(anchor.height());
  } else {
    anchor.offsetY(anchor.height() / 2);
  }
}
