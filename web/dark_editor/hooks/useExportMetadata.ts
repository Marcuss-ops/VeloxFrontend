'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { translateText } from '@/lib/api';
import type { BatchVideo, LocalizedMetadata, RenderedVariant } from '@/components/editor/export/types';

interface UseExportMetadataOptions {
  open: boolean;
  privateVideos: BatchVideo[];
  selectedVideoIds: string[];
  targetVideos: BatchVideo[];
  visiblePrivateVideos: BatchVideo[];
  setVariantPreviews: Dispatch<SetStateAction<Record<string, RenderedVariant>>>;
}

export interface UseExportMetadataReturn {
  youtubeTitle: string;
  setYoutubeTitle: Dispatch<SetStateAction<string>>;
  youtubeDescription: string;
  setYoutubeDescription: Dispatch<SetStateAction<string>>;
  isTranslatingMetadata: boolean;
  metadataTranslationError: string;
  translatedMetadata: Record<string, LocalizedMetadata>;
  setTranslatedMetadata: Dispatch<SetStateAction<Record<string, LocalizedMetadata>>>;
  translateCompletedMetadata: () => Promise<void>;
  localizedMetadataByVideo: Record<string, { language: string; title: string; description: string }>;
}

/**
 * useExportMetadata — owns the YouTube title/description state, the
 * background translation and the per-video localized-metadata map.
 * Extracted from useExportDialog.
 */
export function useExportMetadata(opts: UseExportMetadataOptions): UseExportMetadataReturn {
  const { open, privateVideos, selectedVideoIds, targetVideos, visiblePrivateVideos, setVariantPreviews } = opts;

  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [translatedMetadata, setTranslatedMetadata] = useState<Record<string, LocalizedMetadata>>({});
  const [isTranslatingMetadata, setIsTranslatingMetadata] = useState(false);
  const [metadataTranslationError, setMetadataTranslationError] = useState('');
  const metadataTranslationKeyRef = useRef('');
  const metadataTranslationInFlightRef = useRef<string | null>(null);

  // Seed title/description from the first authorized target once loaded.
  useEffect(() => {
    const video = privateVideos[0];
    if (!video) return;
    setYoutubeTitle((current) => current || video.title || '');
    setYoutubeDescription((current) => current || video.description || '');
  }, [privateVideos]);

  // Reset translated metadata when the dialog (re)opens.
  useEffect(() => {
    if (!open) return;
    setTranslatedMetadata({});
    metadataTranslationKeyRef.current = '';
  }, [open]);

  // Translate only after the operator leaves the title/description fields.
  // This deliberately does not watch the input values, so typing never
  // spends AI attempts. The key also makes the same completed text idempotent.
  const translateCompletedMetadata = useCallback(async () => {
    const title = youtubeTitle.trim();
    const description = youtubeDescription.trim();
    if (!title || !description) return;

    const translateTargets = selectedVideoIds.length > 0
      ? privateVideos.filter((video) => selectedVideoIds.includes(video.video_id))
      : privateVideos.slice(0, 1);
    const languages = [...new Set(translateTargets.map((video) => video.language?.trim().toLowerCase()).filter(Boolean) as string[])].sort();
    if (languages.length === 0) return;

    const key = JSON.stringify({ title, description, languages });
    if (metadataTranslationKeyRef.current === key || metadataTranslationInFlightRef.current === key) return;
    metadataTranslationInFlightRef.current = key;
    setIsTranslatingMetadata(true);
    setMetadataTranslationError('');
    try {
      const next: Record<string, LocalizedMetadata> = {};
      for (const language of languages) {
        if (language === 'en') {
          next[language] = { title, description };
          continue;
        }
        const [translatedTitle, translatedDescription] = await Promise.all([
          translateText({ text: title, target_language: language, kind: 'title' }),
          translateText({ text: description, target_language: language, kind: 'description' }),
        ]);
        next[language] = {
          title: translatedTitle.translated_text || title,
          description: translatedDescription.translated_text || description,
        };
      }
      metadataTranslationKeyRef.current = key;
      setTranslatedMetadata(next);
      setVariantPreviews((current) => {
        const updated = { ...current };
        for (const video of translateTargets) {
          const language = video.language?.trim().toLowerCase() || 'en';
          const localized = next[language];
          if (localized && updated[video.video_id]) {
            updated[video.video_id] = { ...updated[video.video_id], title: localized.title, description: localized.description };
          }
        }
        return updated;
      });
    } catch (error) {
      setMetadataTranslationError(error instanceof Error ? error.message : 'Traduzione non riuscita');
    } finally {
      metadataTranslationInFlightRef.current = null;
      setIsTranslatingMetadata(false);
    }
  }, [privateVideos, selectedVideoIds, setVariantPreviews, youtubeDescription, youtubeTitle]);

  // Debounced background translation once the fields are filled in.
  useEffect(() => {
    if (!open || !youtubeTitle.trim() || !youtubeDescription.trim() || targetVideos.length === 0) return;
    const timer = window.setTimeout(() => void translateCompletedMetadata(), 700);
    return () => window.clearTimeout(timer);
  }, [open, targetVideos.length, translateCompletedMetadata, youtubeDescription, youtubeTitle]);

  const localizedMetadataByVideo = useMemo(() => {
    const next: Record<string, { language: string; title: string; description: string }> = {};
    for (const video of visiblePrivateVideos) {
      const language = video.language?.trim().toLowerCase() || 'en';
      const localized = translatedMetadata[language];
      next[video.video_id] = {
        language,
        title: localized?.title || (language === 'en' ? youtubeTitle.trim() : video.title),
        description: localized?.description || (language === 'en' ? youtubeDescription.trim() : ''),
      };
    }
    return next;
  }, [translatedMetadata, visiblePrivateVideos, youtubeDescription, youtubeTitle]);

  return {
    youtubeTitle,
    setYoutubeTitle,
    youtubeDescription,
    setYoutubeDescription,
    isTranslatingMetadata,
    metadataTranslationError,
    translatedMetadata,
    setTranslatedMetadata,
    translateCompletedMetadata,
    localizedMetadataByVideo,
  };
}
