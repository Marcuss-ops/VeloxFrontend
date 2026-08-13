'use client';

// Barrel for the canvas rendering layer. The per-kind object renderers live
// in ./renderers and are typed by the CanvasObject union; this file keeps the
// public surface stable for Canvas.tsx and the tests
// that mock this module path.
export { ObjectRenderer } from './renderers/ObjectRenderer';
export { GridOverlay } from './renderers/GridOverlay';
export { TextEditorOverlay } from './renderers/TextEditorOverlay';
export { DocumentCropOverlay } from './renderers/DocumentCropOverlay';
export { CropSelectionOverlay } from './renderers/CropSelectionOverlay';
