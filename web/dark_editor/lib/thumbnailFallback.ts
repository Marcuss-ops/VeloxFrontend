// lib/thumbnailFallback.ts — Neutral placeholder for thumbnails that
// cannot be loaded.
//
// Deliberately TEXT-FREE: a placeholder that says "Thumbnail non
// disponibile" gets drawn into the canvas and then burned into every
// exported/persisted cover preview. A neutral dark frame keeps the
// canvas honest without leaking a misleading label into the artwork.

/** 1280x720 neutral placeholder SVG (no text). */
export function neutralThumbnailSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#111827"/></svg>';
}

/**
 * Data URL variant for client-side renderers that need a loadable image
 * (shape/text image fills). The label parameter is kept for back-compat
 * with legacy callers but is intentionally IGNORED — the placeholder is
 * always neutral so it can never be exported into a cover.
 */
export function thumbnailFallbackDataUrl(_label?: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(neutralThumbnailSvg())}`;
}
