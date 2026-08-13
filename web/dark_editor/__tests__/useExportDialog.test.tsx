// @vitest-environment jsdom
//
// Dedicated unit tests for useExportDialog (the export/publish flow hook).
// Heavy I/O (canvas capture, translation, BFF uploads) and the target
// resolver are mocked; the zustand stores are real. The covered surface is
// the hook's own logic that the component-level render test does not reach:
//   - metadata seeding from the authorized target
//   - translation-layer resolution + selection
//   - scoped-project detection
//   - target filtering by platform account
//   - localized-metadata fallback
//   - background translation + idempotency
//   - apply-to-videos guards

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useExportDialog } from '@/hooks/useExportDialog';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { translateText } from '@/lib/api';
import { captureEditorCanvasBlob, sha256Hex } from '@/lib/canvasPreview';
import { downloadBlob } from '@/components/editor/export/helpers';
import { EXPORT_WIDTH, EXPORT_HEIGHT } from '@/components/editor/export/types';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import type { TextObject } from '@/stores/editorStore';

// Controllable target context. The hook consumes useBatchYouTubeTargets;
// these holders let each test drive the authorized video list + selection
// without hitting the BFF. Functions are stable references so the hook's
// effects do not re-run every render.
const targetMock = vi.hoisted(() => {
  const holder: { videos: GroupVideo[]; selectedVideoIds: string[] } = {
    videos: [],
    selectedVideoIds: [],
  };
  const noop = () => {};
  return {
    holder,
    useBatchYouTubeTargets: () => ({
      videos: holder.videos,
      visibleVideos: holder.videos,
      latestPerChannel: holder.videos,
      selectedVideoIds: holder.selectedVideoIds,
      setSelectedVideoIds: noop,
      selectedCount: holder.selectedVideoIds.length,
      toggleVideo: noop,
      selectAllVisible: noop,
      deselectAll: noop,
      selectLatest: noop,
      resetSelection: noop,
      loading: false,
      error: null,
      warnings: [],
    }),
  };
});

vi.mock('@/hooks/useBatchYouTubeTargets', () => ({
  useBatchYouTubeTargets: targetMock.useBatchYouTubeTargets,
}));

vi.mock('@/lib/api', () => ({
  translateText: vi.fn(
    async ({ text, target_language }: { text: string; target_language: string; kind: string }) => ({
      translated_text: `[${target_language}]${text}`,
    }),
  ),
}));

vi.mock('@/lib/canvasPreview', () => ({
  canvasStateSignature: vi.fn(() => 'signature'),
  captureEditorCanvasBlob: vi.fn(async () => null),
  sha256Hex: vi.fn(async () => 'sha256'),
}));

vi.mock('@/components/editor/export/helpers', () => ({
  downloadBlob: vi.fn(),
  convertToPng: vi.fn(async (blob: Blob) => blob),
  normalizedPlatformAccountId: (video: { platform_account_id?: number | string }) => {
    const value = Number(video.platform_account_id);
    return Number.isFinite(value) && value > 0 ? value : null;
  },
}));

vi.mock('@/lib/api/bff', () => ({
  uploadMediaAsset: vi.fn(),
  updateEditorSessionThumbnail: vi.fn(),
}));

vi.mock('@/lib/editorEvents', () => ({
  requestEditorFlush: vi.fn(async () => {}),
}));

function makeVideo(overrides: Partial<GroupVideo> = {}): GroupVideo {
  return {
    youtube_video_id: 'yt-1',
    video_id: 'video-1',
    title: 'Cover Title',
    description: 'Cover Description',
    thumbnail_url: 'https://example.com/thumb.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    privacy_status: 'private',
    platform_account_id: 123,
    channel_name: 'Channel',
    ...overrides,
  };
}

function makeTextObject(overrides: Partial<TextObject> = {}): TextObject {
  return {
    id: 'text-1',
    type: 'text',
    name: 'Text',
    text: 'Hello',
    translate: true,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    ...overrides,
  };
}

function makeProject(id: string) {
  return {
    id,
    name: 'Project',
    type: 'editor',
    canvas_json: {},
    preview_url: '',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };
}

function setTargets(videos: GroupVideo[], selectedVideoIds: string[] = []) {
  targetMock.holder.videos = videos;
  targetMock.holder.selectedVideoIds = selectedVideoIds;
}

const pngBlob = new Blob(['png'], { type: 'image/png' });

// A minimal mocked Konva stage: the hook only calls `getStage()` on the
// canvas ref and hands the result to the (mocked) capture helper.
function makeCanvasRef() {
  const stage = {};
  const getStage = vi.fn(() => stage);
  return { canvasRef: { current: { getStage } }, getStage, stage };
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
  vi.mocked(captureEditorCanvasBlob).mockResolvedValue(null);
  vi.mocked(sha256Hex).mockResolvedValue('sha256');
  useEditorStore.getState().clearCanvas();
  useProjectStore.getState().setCurrentProject(null);
  useUIStore.getState().setExportDialog(false);
  useUIStore.setState({ toasts: [] });
  setTargets([], []);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useExportDialog', () => {
  it('seeds youtube title/description from the first target video', () => {
    setTargets([makeVideo({ video_id: 'v1', title: 'Seed Title', description: 'Seed Desc' })]);
    const { result } = renderHook(() => useExportDialog({}));

    expect(result.current.youtubeTitle).toBe('Seed Title');
    expect(result.current.youtubeDescription).toBe('Seed Desc');
  });

  it('resolves the translation layer from text layers and reports selection', () => {
    useEditorStore.getState().loadObjects([makeTextObject()]);
    useEditorStore.getState().selectObject('text-1');
    const { result } = renderHook(() => useExportDialog({}));

    expect(result.current.translationLayer?.id).toBe('text-1');
    expect(result.current.hasSelection).toBe(true);
  });

  it('has no selection and no translation layer on an empty canvas', () => {
    const { result } = renderHook(() => useExportDialog({}));

    expect(result.current.hasSelection).toBe(false);
    expect(result.current.translationLayer).toBeUndefined();
  });

  it('flags isEditorSession only for scoped project ids', () => {
    const first = renderHook(() => useExportDialog({}));
    expect(first.result.current.isEditorSession).toBe(false);
    first.unmount();

    act(() => useProjectStore.getState().setCurrentProject(makeProject('ve_abc123')));
    const scoped = renderHook(() => useExportDialog({}));
    expect(scoped.result.current.isEditorSession).toBe(true);
  });

  it('filters targetVideos to selected ids with a valid platform account', () => {
    const valid = makeVideo({ video_id: 'v1', platform_account_id: 123 });
    const invalid = makeVideo({ video_id: 'v2', platform_account_id: 0 });
    setTargets([valid, invalid], ['v1', 'v2']);

    const { result } = renderHook(() => useExportDialog({}));

    expect(result.current.targetVideos.map((video) => video.video_id)).toEqual(['v1']);
  });

  it('falls back to the EN title/description in localizedMetadataByVideo', () => {
    setTargets([makeVideo({ video_id: 'v1', title: 'Hello', description: 'World' })]);
    const { result } = renderHook(() => useExportDialog({}));

    expect(result.current.localizedMetadataByVideo['v1']).toEqual({
      language: 'en',
      title: 'Hello',
      description: 'World',
    });
  });

  it('translates non-EN metadata once and is idempotent', async () => {
    setTargets([makeVideo({ video_id: 'v1', language: 'it', platform_account_id: 123 })], ['v1']);
    const { result } = renderHook(() => useExportDialog({}));

    act(() => {
      result.current.setYoutubeTitle('Hello');
      result.current.setYoutubeDescription('World');
    });

    await act(async () => {
      await result.current.translateCompletedMetadata();
    });
    expect(result.current.translatedMetadata['it']).toEqual({
      title: '[it]Hello',
      description: '[it]World',
    });
    expect(translateText).toHaveBeenCalledTimes(2);

    // Same completed text → the translation key dedupes the second call.
    await act(async () => {
      await result.current.translateCompletedMetadata();
    });
    expect(translateText).toHaveBeenCalledTimes(2);
  });

  it('warns when applying covers with no authorized video selected', async () => {
    const { result } = renderHook(() => useExportDialog({}));

    await act(async () => {
      await result.current.handleApplyToSelectedVideos();
    });

    expect(
      useUIStore.getState().toasts.some((toast) => toast.message === 'Nessun video autorizzato selezionato.'),
    ).toBe(true);
  });

  it('warns when applying covers before variants are generated', async () => {
    setTargets([makeVideo({ video_id: 'v1', platform_account_id: 123 })], ['v1']);
    const { result } = renderHook(() => useExportDialog({}));

    await act(async () => {
      await result.current.handleApplyToSelectedVideos();
    });

    expect(
      useUIStore.getState().toasts.some((toast) => toast.message === 'Attendi la generazione delle varianti per lingua.'),
    ).toBe(true);
  });

  it('prefers the onClose prop over the store close', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useExportDialog({ onClose }));

    act(() => result.current.handleClose());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().showExportDialog).toBe(false);
  });
});

describe('useExportDialog.handleExport', () => {
  it('warns when the canvas cannot produce a blob', async () => {
    vi.mocked(captureEditorCanvasBlob).mockResolvedValue(null);
    const { canvasRef, getStage } = makeCanvasRef();
    const { result } = renderHook(() => useExportDialog({ canvasRef }));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(getStage).toHaveBeenCalled();
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(
      useUIStore.getState().toasts.some((toast) => toast.message === 'Canvas not found'),
    ).toBe(true);
  });

  it('downloads the exported PNG and reports success', async () => {
    vi.mocked(captureEditorCanvasBlob).mockResolvedValue(pngBlob);
    const { canvasRef, getStage } = makeCanvasRef();
    const { result } = renderHook(() => useExportDialog({ canvasRef }));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(getStage).toHaveBeenCalled();
    expect(downloadBlob).toHaveBeenCalledWith(pngBlob, 'thumbnail.png');
    expect(
      useUIStore.getState().toasts.some((toast) =>
        toast.message.includes('Export PNG completato'),
      ),
    ).toBe(true);
  });
});

describe('useExportDialog.saveVariantEdit', () => {
  it('does nothing when there is no editing draft or variant', async () => {
    vi.mocked(captureEditorCanvasBlob).mockResolvedValue(pngBlob);
    const { canvasRef } = makeCanvasRef();
    const { result } = renderHook(() => useExportDialog({ canvasRef }));

    await act(async () => {
      await result.current.saveVariantEdit();
    });

    expect(captureEditorCanvasBlob).not.toHaveBeenCalled();
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('re-renders the cover with the edited text and resets the draft', async () => {
    vi.mocked(captureEditorCanvasBlob).mockResolvedValue(pngBlob);
    setTargets([makeVideo({ video_id: 'v1', platform_account_id: 123, language: 'en' })], ['v1']);
    useEditorStore.getState().loadObjects([makeTextObject()]);

    const { canvasRef, stage } = makeCanvasRef();
    const { result } = renderHook(() => useExportDialog({ isOpen: true, canvasRef }));

    await waitFor(() => {
      expect(result.current.variantPreviews['v1']).toBeTruthy();
    });

    act(() => {
      result.current.setEditingVideoId('v1');
      result.current.setEditingDraft({ title: 'New title', description: 'New desc', coverText: 'New cover text' });
    });

    await act(async () => {
      await result.current.saveVariantEdit();
    });

    expect(captureEditorCanvasBlob).toHaveBeenCalledWith(
      stage,
      EXPORT_WIDTH,
      EXPORT_HEIGHT,
      'image/png',
      undefined,
      { textOverrides: { 'text-1': 'New cover text' } },
    );
    expect(result.current.editingVideoId).toBeNull();
    expect(result.current.editingDraft).toBeNull();
    expect(result.current.variantPreviews['v1'].title).toBe('New title');
    expect(result.current.variantPreviews['v1'].translatedText).toBe('New cover text');
    expect(
      useUIStore.getState().toasts.some((toast) => toast.message === 'Variante aggiornata per il target autorizzato.'),
    ).toBe(true);
  });
});
