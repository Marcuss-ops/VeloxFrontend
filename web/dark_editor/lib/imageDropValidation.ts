// lib/imageDropValidation.ts — Pure helpers for classifying drag-drop
// payloads as images. Extracted from hooks/useDragDropUpload.ts so the
// hook stays focused on upload orchestration; these are DOM-only utilities
// (no React, no store) and can be unit-tested in isolation.

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i;

/**
 * A drop is an image when the browser declares an image MIME type, OR the
 * type is empty / generic octet-stream but the filename looks like an
 * image. Empty-type and octet-stream files were previously dropped
 * silently — the filter below is what made a drag "do nothing" for common
 * cases (webp/avif from some sources, files dragged with an unrecognized
 * MIME). The upload route re-checks the declared type before saving.
 */
export function isImageLike(file: File | (Blob & { name?: string })): boolean {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type.startsWith('image/');
  }
  return IMAGE_EXTENSION_PATTERN.test(file.name ?? '');
}

/** Collect files from BOTH the legacy `files` list and `items` (deduped). */
export function collectDroppedFiles(e: React.DragEvent): File[] {
  const seen = new Set<File>();
  const files: File[] = [];
  const add = (file: File | null) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    files.push(file);
  };
  for (const file of Array.from(e.dataTransfer?.files ?? [])) add(file);
  for (const item of Array.from(e.dataTransfer?.items ?? [])) {
    if (item.kind === 'file') add(item.getAsFile());
  }
  return files;
}

/**
 * Dragging an <img> element from another page/tab carries NO File — only
 * the image URL as string drag data. Read the first http(s) URL present so
 * those drops can be fetched and uploaded instead of being ignored.
 */
export async function readDroppedImageUrl(dataTransfer: DataTransfer | null): Promise<string | null> {
  if (!dataTransfer) return null;
  const texts: string[] = [];
  const pending: Promise<void>[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'string') continue;
    pending.push(
      new Promise<void>((resolve) => {
        try {
          item.getAsString((text) => {
            if (text) texts.push(text);
            resolve();
          });
        } catch {
          resolve();
        }
      }),
    );
  }
  await Promise.all(pending);
  for (const text of texts) {
    const match = text.match(/https?:\/\/[^\s"'<>]+/);
    const candidate = match ? match[0] : text.trim();
    if (/^https?:\/\//i.test(candidate)) return candidate;
  }
  return null;
}
