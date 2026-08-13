import { EXPORT_WIDTH, EXPORT_HEIGHT, type BatchVideo } from './types';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function convertToPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Impossibile convertire il file esportato.'));
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_WIDTH;
    canvas.height = EXPORT_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas di esportazione non disponibile.');
    context.drawImage(image, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    const converted = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!converted) throw new Error('Conversione del formato non riuscita.');
    return converted;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function normalizedPlatformAccountId(video: BatchVideo): number | null {
  const value = Number(video.platform_account_id);
  return Number.isFinite(value) && value > 0 ? value : null;
}
