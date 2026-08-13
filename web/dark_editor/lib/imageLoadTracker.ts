// lib/imageLoadTracker.ts — In-memory registry of image sources that
// failed to load in the current editor session.
//
// The editor's image renderers mark every load attempt; useEditorAutosave
// consults this registry before persisting a canvas preview so a broken
// source image (CDN refusal, deleted/private video, transient network
// error) is never burned into the cover's durable thumbnail — that would
// regress the Copertine hub card from its last good preview.
//
// A successful later load clears the entry, so an image that recovers
// (e.g. a bounded retry succeeded) resumes normal preview persistence.

const failedSrcs = new Set<string>();

/** Record a failed load attempt for `src`. */
export function markImageLoadFailed(src: string): void {
  if (src) failedSrcs.add(src);
}

/** Clear the failure mark — the image loaded successfully. */
export function markImageLoadSucceeded(src: string): void {
  if (src) failedSrcs.delete(src);
}

/** True when `src` is known to have failed and has not recovered. */
export function isImageSrcFailed(src?: string): boolean {
  return Boolean(src && failedSrcs.has(src));
}

/** Test/reset seam — clears every recorded failure. */
export function resetImageLoadTracker(): void {
  failedSrcs.clear();
}
