'use client';

import React from 'react';
import { AlertCircle, Loader2, Youtube } from 'lucide-react';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import { BatchVideoGrid } from './BatchVideoGrid';
import type { BatchVideo, RenderedVariant } from './types';

interface TargetVideosSectionProps {
  selectedVideoCount: number;
  selectLatest: () => void;
  latestPrivateVideos: BatchVideo[];
  deselectAll: () => void;
  selectAllVisible: () => void;
  visiblePrivateVideos: BatchVideo[];
  isGeneratingPreviews: boolean;
  youtubeTargetError: string | null;
  youtubeTargetWarnings: string[];
  loadingPrivateVideos: boolean;
  selectedVideoIds: string[];
  variantPreviews: Record<string, RenderedVariant>;
  localizedMetadataByVideo: Record<string, { language: string; title: string; description: string }>;
  uploadResults: Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>;
  toggleVideo: (video: GroupVideo) => void;
  onEditVideo: (video: GroupVideo) => void;
}

/**
 * Right column of the publish dialog: the authorized YouTube target context
 * (header + select-all/latest bar) and the localized cover grid with its
 * loading/empty/error states.
 */
export function TargetVideosSection({
  selectedVideoCount,
  selectLatest,
  latestPrivateVideos,
  deselectAll,
  selectAllVisible,
  visiblePrivateVideos,
  isGeneratingPreviews,
  youtubeTargetError,
  youtubeTargetWarnings,
  loadingPrivateVideos,
  selectedVideoIds,
  variantPreviews,
  localizedMetadataByVideo,
  uploadResults,
  toggleVideo,
  onEditVideo,
}: TargetVideosSectionProps) {
  return (
    <section className="min-w-0 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[68px] shrink-0 items-center gap-2 border-b px-5">
          <Youtube className="h-4 w-4 fill-red-500 text-red-500" />
          <span className="text-sm font-semibold text-[#111111]">Contesto progetto autorizzato</span>
          <span className="text-xs text-[#6e6e73]">Target ricevuto da InstaEdit</span>
        </div>
        <div className="flex h-14 shrink-0 items-center justify-between px-5">
          <h2 className="text-[15px] font-semibold text-[#111111]">{selectedVideoCount} video selezionati</h2>
          <div className="flex items-center gap-4 text-xs">
            <button type="button" onClick={selectLatest} disabled={latestPrivateVideos.length === 0} className="font-medium text-[#2f6b3d] hover:text-[#1f4d2a] disabled:cursor-not-allowed disabled:opacity-40">Ultimo per canale ({latestPrivateVideos.length})</button>
            <button type="button" onClick={selectedVideoCount > 0 ? deselectAll : selectAllVisible} disabled={visiblePrivateVideos.length === 0} className="text-[#6e6e73] hover:text-[#111111] disabled:opacity-40">{selectedVideoCount > 0 ? 'Deseleziona tutti' : 'Seleziona tutti'}</button>
          </div>
        </div>

        <div className="publish-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {isGeneratingPreviews && <div className="mb-4 rounded-[10px] border border-black/[0.08] bg-white px-3 py-2.5 text-[11px] text-[#6e6e73]">Generazione automatica delle copertine localizzate…</div>}
          {youtubeTargetError && <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#efc7c3] bg-[#fff2f0] px-3 py-2 text-xs text-[#a33a31]"><AlertCircle className="h-4 w-4" />{youtubeTargetError}</div>}
          {youtubeTargetWarnings.map((warning) => <p key={warning} className="mb-2 text-[10px] text-[#8a641d]">{warning}</p>)}
          {loadingPrivateVideos ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[#6e6e73]"><Loader2 className="h-4 w-4 animate-spin" />Caricamento video privati…</div>
          ) : visiblePrivateVideos.length === 0 ? (
            <div className="rounded-[10px] border border-black/[0.08] bg-white p-5 text-sm text-[#6e6e73]">Il contesto video autorizzato non è disponibile.</div>
          ) : (
            <BatchVideoGrid videos={visiblePrivateVideos} selectedVideoIds={selectedVideoIds} variantPreviews={variantPreviews} localizedMetadata={localizedMetadataByVideo} uploadResults={uploadResults} onToggle={toggleVideo} onEdit={onEditVideo} />
          )}
        </div>
      </div>
    </section>
  );
}

export default TargetVideosSection;
