import type Konva from 'konva';

/**
 * Imperative handle exposed by the Canvas component (via
 * `useImperativeHandle`) so autosave, export and feed-preview can reach the
 * live Konva stage without reaching into react-konva internals. The single
 * source of truth for the `canvasRef` prop threaded through the editor.
 */
export interface CanvasHandle {
  getStage: () => Konva.Stage | null;
}
