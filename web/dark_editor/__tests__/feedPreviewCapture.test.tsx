// @vitest-environment jsdom
//
// Behavioral replacement for the old source-text tests. The previous version
// read FeedPreviewDialog.tsx and DocumentCropOverlay.tsx from disk and
// matched literal strings (querySelector / toDataURL / exportStageToBlob /
// name="document-crop-overlay"), so a benign rename or comment could flip
// the guard while a broken component could stay green. These render the real
// components and assert what they actually do.

import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEditorStore } from '@/stores/editorStore';

// Capture must go through the canonical export helper — mock it so the call
// (and its arguments) is observable instead of reading the source for the
// string "exportStageToBlob".
vi.mock('@/lib/canvasExport', () => ({
  exportStageToBlob: vi.fn(),
}));

// react-konva nodes render as inert <konva-node> tags so DocumentCropOverlay
// can be mounted without a real Konva canvas. The imperative handle exposes
// the node surface its effect/handlers touch (nodes / getLayer / scale…).
vi.mock('react-konva', async () => {
  const React = await import('react');
  const Node = React.forwardRef((props: any, ref: any) => {
    const { name, children } = props;
    React.useImperativeHandle(ref, () => ({
      nodes: () => {},
      getLayer: () => ({ batchDraw: () => {} }),
      scaleX: () => 1,
      scaleY: () => 1,
      width: () => 1,
      height: () => 1,
      x: () => 0,
      y: () => 0,
      position: () => {},
    }));
    return React.createElement('konva-node', name ? { name } : undefined, children);
  });
  return { Group: Node, Line: Node, Rect: Node, Transformer: Node, Stage: Node, Layer: Node };
});

import FeedPreviewDialog from '@/components/editor/FeedPreviewDialog';
import { DocumentCropOverlay } from '@/components/editor/canvas/renderers/DocumentCropOverlay';
import { exportStageToBlob } from '@/lib/canvasExport';

const fakeStage = { isFakeStage: true };

beforeAll(() => {
  // jsdom has no blob URL factory — stub it so the happy path can run.
  URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().clearCanvas();
});

afterEach(cleanup);

describe('FeedPreviewDialog capture (behavior)', () => {
  it('captures the preview through the canonical exportStageToBlob helper', async () => {
    vi.mocked(exportStageToBlob).mockResolvedValue({ blob: new Blob(['png']) });
    const canvasRef: React.RefObject<any> = { current: { getStage: () => fakeStage } };

    render(<FeedPreviewDialog isOpen onClose={() => {}} canvasRef={canvasRef} />);

    await waitFor(() => expect(exportStageToBlob).toHaveBeenCalledTimes(1));
    expect(exportStageToBlob).toHaveBeenCalledWith(fakeStage, 1920, 1080, 'png', 100);
    // The captured blob becomes the rendered preview image.
    expect(await screen.findByAltText('Generated Preview')).toBeTruthy();
  });

  it('falls back to the loading state when no canvas stage is wired', () => {
    render(<FeedPreviewDialog isOpen onClose={() => {}} />);
    expect(screen.getByText('Generating thumbnail...')).toBeTruthy();
    expect(exportStageToBlob).not.toHaveBeenCalled();
  });
});

describe('DocumentCropOverlay export-exclude tag (behavior)', () => {
  const props = {
    canvasWidth: 100,
    canvasHeight: 100,
    cropRect: { x: 10, y: 10, width: 50, height: 50 },
    onCropRectChange: () => {},
  };

  it('tags its root Group as export-exclude so export skips it', () => {
    const { container } = render(<DocumentCropOverlay {...props} />);
    expect(container.querySelector('[name="export-exclude"]')).toBeTruthy();
  });

  it('no longer renders the legacy document-crop-overlay name', () => {
    const { container } = render(<DocumentCropOverlay {...props} />);
    expect(container.querySelector('[name="document-crop-overlay"]')).toBeNull();
  });
});
