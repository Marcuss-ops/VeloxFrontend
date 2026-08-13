// @vitest-environment jsdom
//
// Dedicated unit tests for useExportUpload (the apply-to-videos sub-hook
// extracted from useExportDialog). convertToPng and the two BFF upload calls
// are mocked; the toast store is the real zustand store so the toast contract
// is asserted end-to-end.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { useExportUpload } from '@/hooks/useExportUpload';
import { convertToPng } from '@/components/editor/export/helpers';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';
import { useUIStore } from '@/stores/uiStore';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import type { RenderedVariant } from '@/components/editor/export/types';

vi.mock('@/components/editor/export/helpers', () => ({
  convertToPng: vi.fn(async (blob: Blob) => blob),
}));

vi.mock('@/lib/api/bff', () => ({
  uploadMediaAsset: vi.fn(async () => 'media-123'),
  updateEditorSessionThumbnail: vi.fn(async () => {}),
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

const pngBlob = new Blob(['png'], { type: 'image/png' });

function makeVariant(overrides: Partial<RenderedVariant> = {}): RenderedVariant {
  return {
    variantId: 'var-1',
    language: 'en',
    snapshotId: 'snap-1',
    previewUrl: 'blob:preview',
    blob: pngBlob,
    sha256: 'sha256',
    title: 'Title',
    description: 'Desc',
    translatedText: 'Cover text',
    ...overrides,
  };
}

function renderUpload(opts: {
  targetVideos?: GroupVideo[];
  variantPreviews?: Record<string, RenderedVariant>;
  currentProjectId?: string;
}) {
  const variantPreviewsRef: MutableRefObject<Record<string, RenderedVariant>> = {
    current: opts.variantPreviews ?? {},
  };
  const hook = renderHook(() =>
    useExportUpload({
      open: false,
      targetVideos: opts.targetVideos ?? [],
      variantPreviewsRef,
      currentProjectId: opts.currentProjectId,
      addToast: useUIStore.getState().addToast,
    }),
  );
  return { hook, variantPreviewsRef };
}

beforeEach(() => {
  useUIStore.setState({ toasts: [] });
  vi.mocked(uploadMediaAsset).mockResolvedValue('media-123');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useExportUpload', () => {
  it('warns when no authorized video is selected', async () => {
    const { hook } = renderUpload({});

    await act(async () => {
      await hook.result.current.handleApplyToSelectedVideos();
    });

    expect(uploadMediaAsset).not.toHaveBeenCalled();
    expect(
      useUIStore.getState().toasts.some((toast) => toast.message === 'Nessun video autorizzato selezionato.'),
    ).toBe(true);
  });

  it('warns when variants have not been generated yet', async () => {
    const { hook } = renderUpload({
      targetVideos: [makeVideo({ video_id: 'v1' })],
    });

    await act(async () => {
      await hook.result.current.handleApplyToSelectedVideos();
    });

    expect(uploadMediaAsset).not.toHaveBeenCalled();
    expect(
      useUIStore.getState().toasts.some((toast) => toast.message === 'Attendi la generazione delle varianti per lingua.'),
    ).toBe(true);
  });

  it('uploads each variant and reports success', async () => {
    const { hook } = renderUpload({
      targetVideos: [makeVideo({ video_id: 'v1' })],
      variantPreviews: { v1: makeVariant({ language: 'en' }) },
      currentProjectId: 've_abc',
    });

    await act(async () => {
      await hook.result.current.handleApplyToSelectedVideos();
    });

    expect(convertToPng).toHaveBeenCalledWith(pngBlob);
    expect(uploadMediaAsset).toHaveBeenCalledWith(pngBlob, 've_abc_en.png');
    expect(updateEditorSessionThumbnail).toHaveBeenCalledWith('ve_abc', 'media-123');
    expect(hook.result.current.uploadResults['v1']).toMatchObject({ status: 'success' });
    expect(
      useUIStore.getState().toasts.some((toast) =>
        toast.type === 'success' && toast.message === '1 copertina/e inviata/e al video selezionato.',
      ),
    ).toBe(true);
  });

  it('prefers the per-video project id over the current project id', async () => {
    const { hook } = renderUpload({
      targetVideos: [makeVideo({ video_id: 'v1', velox_project_id: 've_video' })],
      variantPreviews: { v1: makeVariant({ language: 'it' }) },
      currentProjectId: 've_current',
    });

    await act(async () => {
      await hook.result.current.handleApplyToSelectedVideos();
    });

    expect(uploadMediaAsset).toHaveBeenCalledWith(pngBlob, 've_video_it.png');
    expect(updateEditorSessionThumbnail).toHaveBeenCalledWith('ve_video', 'media-123');
  });

  it('marks the video as errored when no project id is available', async () => {
    const { hook } = renderUpload({
      targetVideos: [makeVideo({ video_id: 'v1' })],
      variantPreviews: { v1: makeVariant() },
      currentProjectId: undefined,
    });

    await act(async () => {
      await hook.result.current.handleApplyToSelectedVideos();
    });

    expect(uploadMediaAsset).not.toHaveBeenCalled();
    expect(hook.result.current.uploadResults['v1']).toMatchObject({
      status: 'error',
      message: 'Progetto video non disponibile.',
    });
  });

  it('reports a partial failure with a warning toast', async () => {
    vi.mocked(uploadMediaAsset)
      .mockResolvedValueOnce('media-ok')
      .mockRejectedValueOnce(new Error('boom'));
    const { hook } = renderUpload({
      targetVideos: [
        makeVideo({ video_id: 'v1' }),
        makeVideo({ video_id: 'v2', youtube_video_id: 'yt-2' }),
      ],
      variantPreviews: { v1: makeVariant(), v2: makeVariant({ variantId: 'var-2' }) },
      currentProjectId: 've_abc',
    });

    await act(async () => {
      await hook.result.current.handleApplyToSelectedVideos();
    });

    expect(hook.result.current.uploadResults['v1'].status).toBe('success');
    expect(hook.result.current.uploadResults['v2'].status).toBe('error');
    expect(
      useUIStore.getState().toasts.some(
        (toast) => toast.type === 'warning' && toast.message === '1 copertine inviate, 1 con errore.',
      ),
    ).toBe(true);
  });
});
