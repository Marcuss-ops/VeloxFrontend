export interface ExportedBlob {
  blob: Blob;
  mime: string;
}

export function getCanvasElement(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.querySelector('.canvas-container .konvajs-content canvas') as HTMLCanvasElement | null;
}

export function exportCanvasToBlob(
  format: string,
  quality: number
): Promise<ExportedBlob | null> {
  const canvasEl = getCanvasElement();
  if (!canvasEl) {
    return Promise.resolve(null);
  }

  const mime =
    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const q = Math.max(0.01, Math.min(1, quality / 100));

  return new Promise<ExportedBlob | null>((resolve) => {
    canvasEl.toBlob(
      (b) => {
        if (!b) return resolve(null);
        resolve({ blob: b, mime });
      },
      mime,
      mime === 'image/png' ? undefined : q
    );
  });
}
