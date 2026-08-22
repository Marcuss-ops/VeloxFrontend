'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Download } from 'lucide-react';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import type { UseExportDialogReturn } from '@/hooks/useExportDialog';
import { CoverPreviewSection } from './CoverPreviewSection';
import { MetadataSection } from './MetadataSection';
import { TargetVideosSection } from './TargetVideosSection';
import { VariantEditModal } from './VariantEditModal';
import { PublishFooter } from './PublishFooter';
import { DraftCoverPicker } from './DraftCoverPicker';

/**
 * Live publish-flow UI of the export dialog (light theme). Composition root:
 * every section is a pure presentational sub-component fed by the
 * useExportDialog hook; this file only owns the dialog chrome and the wiring.
 */
export function PublishExportDialog({ dialog }: { dialog: UseExportDialogReturn }) {
  const {
    open,
    handleClose,
    hasSelection,
    selectedOnly,
    setSelectedOnly,
    youtubeTitle,
    setYoutubeTitle,
    youtubeDescription,
    setYoutubeDescription,
    isTranslatingMetadata,
    metadataTranslationError,
    translatedMetadata,
    translateCompletedMetadata,
    coverPreviewUrl,
    showCoverPreview,
    setShowCoverPreview,
    snapshotStale,
    draftCovers,
    selectedDraftId,
    selectDraft,
    loadingDraftCovers,
    variantPreviews,
    isGeneratingPreviews,
    allSelectedVariantsReady,
    localizedMetadataByVideo,
    uploadResults,
    isApplyingToVideos,
    editingVideoId,
    setEditingVideoId,
    editingDraft,
    setEditingDraft,
    isSavingVariantEdit,
    saveVariantEdit,
    privateVideos,
    visiblePrivateVideos,
    latestPrivateVideos,
    selectedVideoIds,
    selectedVideoCount,
    toggleVideo,
    selectAllVisible,
    deselectAll,
    selectLatest,
    loadingPrivateVideos,
    youtubeTargetError,
    youtubeTargetWarnings,
    targetVideos,
    handleApplyToSelectedVideos,
  } = dialog;

  const handleEditVideo = (video: GroupVideo) => {
    const variant = variantPreviews[video.video_id];
    if (!variant) return;
    setEditingVideoId(video.video_id);
    setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="h-[min(980px,96vh)] w-[min(1500px,94vw)] max-w-none gap-0 overflow-hidden rounded-[22px] border-black/[0.10] bg-[#f7f7f5] p-0 text-[#111111] shadow-[0_32px_100px_rgba(0,0,0,0.22)]">
        <DialogHeader className="flex h-[58px] shrink-0 flex-row items-center border-b border-black/[0.08] bg-white px-5">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#111111]">
            <Download className="h-4 w-4 text-[#111111]" />
            Pubblica copertine
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <section className="publish-scroll w-[42%] min-w-[480px] overflow-y-auto border-r border-black/[0.08]">
            <div className="space-y-6 p-5">
              <CoverPreviewSection
                hasSelection={hasSelection}
                selectedOnly={selectedOnly}
                setSelectedOnly={setSelectedOnly}
                showCoverPreview={showCoverPreview}
                setShowCoverPreview={setShowCoverPreview}
                coverPreviewUrl={coverPreviewUrl}
                snapshotStale={snapshotStale}
              />

              <DraftCoverPicker drafts={draftCovers} selectedDraftId={selectedDraftId} loading={loadingDraftCovers} onSelect={selectDraft} />

              <div className="h-px bg-black/[0.08]" />

              <MetadataSection
                youtubeTitle={youtubeTitle}
                setYoutubeTitle={setYoutubeTitle}
                youtubeDescription={youtubeDescription}
                setYoutubeDescription={setYoutubeDescription}
                isTranslatingMetadata={isTranslatingMetadata}
                metadataTranslationError={metadataTranslationError}
                translatedMetadata={translatedMetadata}
                translateCompletedMetadata={translateCompletedMetadata}
              />
            </div>
          </section>

          <TargetVideosSection
            selectedVideoCount={selectedVideoCount}
            selectLatest={selectLatest}
            latestPrivateVideos={latestPrivateVideos}
            deselectAll={deselectAll}
            selectAllVisible={selectAllVisible}
            visiblePrivateVideos={visiblePrivateVideos}
            isGeneratingPreviews={isGeneratingPreviews}
            youtubeTargetError={youtubeTargetError}
            youtubeTargetWarnings={youtubeTargetWarnings}
            loadingPrivateVideos={loadingPrivateVideos}
            selectedVideoIds={selectedVideoIds}
            variantPreviews={variantPreviews}
            localizedMetadataByVideo={localizedMetadataByVideo}
            uploadResults={uploadResults}
            toggleVideo={toggleVideo}
            onEditVideo={handleEditVideo}
          />
        </div>

        <VariantEditModal
          editingVideoId={editingVideoId}
          editingDraft={editingDraft}
          setEditingVideoId={setEditingVideoId}
          setEditingDraft={setEditingDraft}
          privateVideos={privateVideos}
          variantPreviews={variantPreviews}
          isSavingVariantEdit={isSavingVariantEdit}
          saveVariantEdit={saveVariantEdit}
        />

        <PublishFooter
          handleClose={handleClose}
          isGeneratingPreviews={isGeneratingPreviews}
          isApplyingToVideos={isApplyingToVideos}
          targetVideos={targetVideos}
          handleApplyToSelectedVideos={handleApplyToSelectedVideos}
          allSelectedVariantsReady={allSelectedVariantsReady}
          selectedDraftId={selectedDraftId}
        />
      </DialogContent>
    </Dialog>
  );
}
