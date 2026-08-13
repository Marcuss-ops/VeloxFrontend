// @vitest-environment jsdom
//
// Dedicated unit tests for useExportMetadata (the metadata/translation
// sub-hook extracted from useExportDialog). Translation is mocked; the hook
// itself owns the title/description seeding, the per-video localized-metadata
// fallback, the translation idempotency and the variant-preview propagation.
//
// Most tests run with `open: false` so the debounced background-translation
// effect stays dormant and `translateCompletedMetadata` is driven explicitly.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { useExportMetadata } from '@/hooks/useExportMetadata';
import { translateText } from '@/lib/api';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import type { RenderedVariant } from '@/components/editor/export/types';

vi.mock('@/lib/api', () => ({
  translateText: vi.fn(
    async ({ text, target_language }: { text: string; target_language: string; kind: string }) => ({
      translated_text: `[${target_language}]${text}`,
    }),
  ),
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

// A controllable variantPreviews setter that mirrors the React useState
// contract, so tests can observe the preview updates the hook pushes.
function makePreviewHolder() {
  const holder: { previews: Record<string, RenderedVariant> } = { previews: {} };
  const setVariantPreviews: Dispatch<SetStateAction<Record<string, RenderedVariant>>> = (updater) => {
    holder.previews = typeof updater === 'function' ? updater(holder.previews) : updater;
  };
  return { holder, setVariantPreviews };
}

function renderMetadata(opts: {
  open?: boolean;
  privateVideos?: GroupVideo[];
  selectedVideoIds?: string[];
  targetVideos?: GroupVideo[];
  visiblePrivateVideos?: GroupVideo[];
  previewHolder?: { holder: { previews: Record<string, RenderedVariant> }; setVariantPreviews: Dispatch<SetStateAction<Record<string, RenderedVariant>>> };
}) {
  const previewHolder = opts.previewHolder ?? makePreviewHolder();
  const hook = renderHook(() =>
    useExportMetadata({
      open: opts.open ?? false,
      privateVideos: opts.privateVideos ?? [],
      selectedVideoIds: opts.selectedVideoIds ?? [],
      targetVideos: opts.targetVideos ?? [],
      visiblePrivateVideos: opts.visiblePrivateVideos ?? [],
      setVariantPreviews: previewHolder.setVariantPreviews,
    }),
  );
  return { hook, previewHolder };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useExportMetadata', () => {
  it('seeds title/description from the first private video', () => {
    const { hook } = renderMetadata({
      privateVideos: [makeVideo({ video_id: 'v1', title: 'Seed Title', description: 'Seed Desc' })],
    });

    expect(hook.result.current.youtubeTitle).toBe('Seed Title');
    expect(hook.result.current.youtubeDescription).toBe('Seed Desc');
  });

  it('leaves title/description empty when there are no videos', () => {
    const { hook } = renderMetadata({});

    expect(hook.result.current.youtubeTitle).toBe('');
    expect(hook.result.current.youtubeDescription).toBe('');
  });

  it('falls back to the EN title/description in localizedMetadataByVideo', () => {
    const { hook } = renderMetadata({
      privateVideos: [makeVideo({ video_id: 'v1', title: 'Hello', description: 'World' })],
      visiblePrivateVideos: [makeVideo({ video_id: 'v1', language: 'en' })],
    });

    expect(hook.result.current.localizedMetadataByVideo['v1']).toEqual({
      language: 'en',
      title: 'Hello',
      description: 'World',
    });
  });

  it('falls back to the video title and empty description for non-EN without a translation', () => {
    const { hook } = renderMetadata({
      visiblePrivateVideos: [makeVideo({ video_id: 'v1', language: 'it', title: 'Titolo' })],
    });

    expect(hook.result.current.localizedMetadataByVideo['v1']).toEqual({
      language: 'it',
      title: 'Titolo',
      description: '',
    });
  });

  it('translates non-EN metadata and propagates it into variant previews', async () => {
    const { hook, previewHolder } = renderMetadata({
      privateVideos: [makeVideo({ video_id: 'v1', language: 'it' })],
      selectedVideoIds: ['v1'],
    });
    previewHolder.holder.previews['v1'] = makeVariant({ language: 'it' });

    act(() => {
      hook.result.current.setYoutubeTitle('Hello');
      hook.result.current.setYoutubeDescription('World');
    });

    await act(async () => {
      await hook.result.current.translateCompletedMetadata();
    });

    expect(hook.result.current.translatedMetadata['it']).toEqual({
      title: '[it]Hello',
      description: '[it]World',
    });
    expect(translateText).toHaveBeenCalledTimes(2);
    expect(previewHolder.holder.previews['v1'].title).toBe('[it]Hello');
    expect(previewHolder.holder.previews['v1'].description).toBe('[it]World');
  });

  it('is idempotent: repeating the same completed text does not re-translate', async () => {
    const { hook } = renderMetadata({
      privateVideos: [makeVideo({ video_id: 'v1', language: 'it' })],
      selectedVideoIds: ['v1'],
    });

    act(() => {
      hook.result.current.setYoutubeTitle('Hello');
      hook.result.current.setYoutubeDescription('World');
    });

    await act(async () => {
      await hook.result.current.translateCompletedMetadata();
    });
    await act(async () => {
      await hook.result.current.translateCompletedMetadata();
    });

    expect(translateText).toHaveBeenCalledTimes(2);
  });

  it('does not translate when title or description is empty', async () => {
    const { hook } = renderMetadata({
      privateVideos: [makeVideo({ video_id: 'v1', language: 'it', title: '', description: '' })],
      selectedVideoIds: ['v1'],
    });

    await act(async () => {
      await hook.result.current.translateCompletedMetadata();
    });

    expect(translateText).not.toHaveBeenCalled();
    expect(hook.result.current.translatedMetadata).toEqual({});
  });
});
