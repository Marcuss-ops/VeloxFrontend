import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('FeedPreviewDialog capture path', () => {
  const dialog = read('components/editor/FeedPreviewDialog.tsx');

  it('does not querySelector the Konva canvas from the DOM', () => {
    // The legacy bug was a querySelector on .canvas-container .konvajs-content canvas
    // followed by canvas.toDataURL('image/png'). Hard-pin the strings so a
    // future refactor cannot reintroduce them.
    expect(dialog.includes('querySelector')).toBe(false);
    expect(dialog.includes('querySelectorAll')).toBe(false);
    expect(dialog.includes('.canvas-container')).toBe(false);
    expect(dialog.includes('.konvajs-content')).toBe(false);
  });

  it('does not call toDataURL/toBlob on an HTMLCanvasElement', () => {
    // Capture must go through the canonical exportStageToBlob helper so that
    // .export-exclude nodes are hidden and zoom/pan is neutralised.
    expect(dialog.includes('canvas.toDataURL(')).toBe(false);
    expect(dialog.includes('canvas.toBlob(')).toBe(false);
    expect(dialog.includes('canvasEl.toBlob(')).toBe(false);
  });

  it('reuses the canonical exportStageToBlob helper for the preview', () => {
    // Independent asserts so future sibling imports from the same module
    // (e.g. `import { exportStageToBlob, foo } from '@/lib/canvasExport'`)
    // don't silently break a single-literal `.includes(...)` check.
    expect(dialog.includes('exportStageToBlob')).toBe(true);
    expect(dialog.includes("from '@/lib/canvasExport'")).toBe(true);
    expect(dialog.includes('exportStageToBlob(')).toBe(true);
    expect(dialog.includes('URL.createObjectURL(')).toBe(true);
  });

  it('accepts an optional canvasRef and falls back to a loading state when missing', () => {
    // Optional prop keeps any caller that hasn't wired the ref yet working
    // (back-compat), but the new path must kick in once wired.
    expect(dialog.includes('canvasRef?: React.RefObject<any>')).toBe(true);
    expect(dialog).toContain('canvasRef?.current?.getStage?.()');
  });
});

describe('document-crop-overlay tag', () => {
  // CanvasRenderers.tsx is a barrel since the per-kind renderer split;
  // DocumentCropOverlay lives in ./renderers/DocumentCropOverlay.tsx.
  const renderers = read('components/editor/canvas/renderers/DocumentCropOverlay.tsx');

  it('no longer uses the old "document-crop-overlay" name', () => {
    // The legacy tag leaked editor overlays (crop rect, dimming, thirds
    // lines) into the exported thumbnail. The fix pins it to the shared
    // "export-exclude" convention so exportStageToBlob's
    // stage.find('.export-exclude') picks it up.
    expect(renderers.includes('name="document-crop-overlay"')).toBe(false);
  });

  it('DocumentCropOverlay\'s return <Group> is tagged "export-exclude"', () => {
    const fnStart = renderers.indexOf('export function DocumentCropOverlay');
    expect(fnStart).toBeGreaterThanOrEqual(0);

    // Find the return (_ block of the function, then read the first
    // <Group> tag inside it. document-crop-overlay is large (~135 LOC of
    // destructure/setup before the return), so we cannot rely on a fixed
    // character window from the function declaration; we anchor on the
    // `return (` so the first <Group> tag IS the visible root.
    // Anchor the regex search strictly AFTER the function declaration
    // so we cannot accidentally grab the `return (` of an earlier
    // component in the same file (TextEditorOverlay / CropSelectionOverlay).
    // String.prototype.search has no fromIndex; we slice and offset.
    const fnBody = renderers.slice(fnStart);
    const localReturn = fnBody.search(/return\s*\(/);
    const returnIdx = localReturn >= 0 ? fnStart + localReturn : -1;
    expect(returnIdx, 'DocumentCropOverlay must contain a return (...) block').toBeGreaterThan(-1);

    const postReturn = renderers.slice(returnIdx, returnIdx + 400);
    const firstGroupMatch = postReturn.match(/<Group\s+name="[^"]+"/);
    expect(firstGroupMatch, 'DocumentCropOverlay must declare a <Group name=...>').not.toBeNull();
    expect(firstGroupMatch?.[0]).toBe('<Group name="export-exclude"');
  });
});
