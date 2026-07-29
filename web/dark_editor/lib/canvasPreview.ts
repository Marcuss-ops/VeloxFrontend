import Konva from 'konva';
import { useEditorStore } from '@/stores/editorStore';

/**
 * Capture a PNG preview of the canvas for project save.
 * Uses the Konva Stage API to produce the correct logical dimensions
 * (canvasWidth × canvasHeight), not the viewport dimensions.
 *
 * @param stage - The Konva.Stage instance from canvasRef.current.getStage()
 */
export async function captureEditorCanvasPreviewFile(
  stage?: Konva.Stage | null
): Promise<File | null> {
  if (!stage) return null;

  const { canvasWidth, canvasHeight } = useEditorStore.getState();

  try {
    const dataURL = stage.toDataURL({
      x: 0,
      y: 0,
      width: Math.max(1, canvasWidth),
      height: Math.max(1, canvasHeight),
      pixelRatio: 1,
      mimeType: 'image/png',
    });

    const res = await fetch(dataURL);
    const blob = await res.blob();
    return new File([blob], 'preview.png', { type: 'image/png' });
  } catch {
    return null;
  }
}
