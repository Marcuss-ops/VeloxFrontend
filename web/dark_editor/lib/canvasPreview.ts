export async function captureEditorCanvasPreviewFile(): Promise<File | null> {
  const canvas = document.querySelector('.canvas-container .konvajs-content canvas') as HTMLCanvasElement | null;
  if (!canvas) return null;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) return null;

  return new File([blob], 'preview.png', { type: 'image/png' });
}

