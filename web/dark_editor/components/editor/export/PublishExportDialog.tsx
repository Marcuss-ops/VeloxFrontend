'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download, Loader2, Youtube, AlertCircle, Eye, EyeOff, UploadCloud } from 'lucide-react';
import { BatchVideoGrid } from '@/components/editor/export/BatchVideoGrid';
import type { UseExportDialogReturn } from '@/hooks/useExportDialog';

/**
 * Live publish-flow UI of the export dialog (light theme). Pure
 * presentational: every value and handler comes from useExportDialog.
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
    isExporting,
    handleExport,
    handleDownloadAllLanguages,
    handleApplyToSelectedVideos,
  } = dialog;

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
              {hasSelection && (
                <label className="flex items-center gap-2 text-xs text-[#6e6e73]">
                  <input type="checkbox" checked={selectedOnly} onChange={(event) => setSelectedOnly(event.target.checked)} className="rounded border-black/20 bg-white" />
                  Esporta solo il layer selezionato
                </label>
              )}

              <div className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm">
                <button type="button" onClick={() => setShowCoverPreview((visible) => !visible)} className="absolute right-2.5 top-2.5 z-10 rounded-lg bg-white/90 p-1.5 text-[#6e6e73] shadow-sm hover:bg-white hover:text-[#111111]" title={showCoverPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}>
                  {showCoverPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {showCoverPreview && (
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-[#111111]">
                    {coverPreviewUrl ? <img src={coverPreviewUrl} alt="Anteprima copertina" className="block h-full w-full object-contain" /> : <span className="text-xs text-white/55">Anteprima non disponibile</span>}
                  </div>
                )}
                {snapshotStale && <div className="border-t border-[#ead9b3] bg-[#fff9eb] px-3.5 py-2 text-[11px] text-[#8a641d]">Il progetto è cambiato. Rigenerazione automatica in corso…</div>}
              </div>

              <div className="space-y-3 rounded-2xl border border-black/[0.08] bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#111111]">Preset YouTube</p>
                    <p className="mt-0.5 text-[10px] text-[#6e6e73]">1920 × 1080 · pronto per le copertine</p>
                  </div>
                  <span className="rounded-md bg-[#f2f2ef] px-2 py-1 text-[10px] font-medium text-[#6e6e73]">16:9</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-[#f7f7f5] px-3 py-2 text-[11px] text-[#6e6e73]">
                  <span>Formato fisso</span>
                  <span className="font-semibold text-[#111111]">PNG · senza perdita</span>
                </div>
              </div>

              <div className="h-px bg-black/[0.08]" />

              <div className="space-y-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#111111]">Titolo, descrizione e tag</h2>
                  <p className="mt-1 text-[11px] text-[#6e6e73]">Puoi modificare i metadati; la privacy resterà privata.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-[#6e6e73]">Titolo</label>
                  <input value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={100} className="h-10 w-full rounded-lg border border-black/[0.12] bg-white px-3 text-sm text-[#111111] outline-none focus:border-black/40" placeholder="Titolo del video" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-[#6e6e73]">Descrizione</label>
                  <textarea value={youtubeDescription} onChange={(event) => setYoutubeDescription(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={5000} rows={5} className="w-full resize-y rounded-lg border border-black/[0.12] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-black/40" placeholder="Descrizione del video" />
                  <p className="mt-1.5 text-[10px] text-[#9a9a96]">{isTranslatingMetadata ? 'Traduzioni in corso…' : metadataTranslationError || (Object.keys(translatedMetadata).length > 0 ? 'Traduzioni aggiornate.' : 'Le traduzioni partono quando esci dal campo.')}</p>
                </div>
              </div>
            </div>
          </section>

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
                  <BatchVideoGrid videos={visiblePrivateVideos} selectedVideoIds={selectedVideoIds} variantPreviews={variantPreviews} localizedMetadata={localizedMetadataByVideo} uploadResults={uploadResults} onToggle={toggleVideo} onEdit={(video) => { const variant = variantPreviews[video.video_id]; if (!variant) return; setEditingVideoId(video.video_id); setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' }); }} />
                )}

              </div>
            </div>
          </section>
        </div>

        {editingVideoId && editingDraft && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!isSavingVariantEdit) { setEditingVideoId(null); setEditingDraft(null); } }}>
            <div className="max-h-[94vh] w-[min(1280px,96vw)] max-w-6xl overflow-y-auto rounded-2xl border border-black/[0.10] bg-white p-6 text-[#111111] shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold text-[#111111]">Modifica variante target</h3><p className="mt-1 text-xs text-[#6e6e73]">{privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || editingVideoId} · lingua {variantPreviews[editingVideoId]?.language || '—'} · render 1920 × 1080</p></div><button type="button" className="text-[#6e6e73] hover:text-[#111111]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>✕</button></div>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#6e6e73]">Anteprima cover tradotta</span><span className="rounded-md border border-black/[0.08] bg-[#f7f7f5] px-2 py-1 text-[10px] text-[#6e6e73]">1920 × 1080 · {variantPreviews[editingVideoId]?.language || '—'}</span></div>
                  <div className="overflow-hidden rounded-xl border border-black/[0.10] bg-[#111111]">
                    {variantPreviews[editingVideoId]?.previewUrl ? <img src={variantPreviews[editingVideoId].previewUrl} alt="Anteprima cover tradotta" className="block aspect-video h-auto w-full object-contain" /> : <div className="flex aspect-video items-center justify-center text-xs text-white/60">Anteprima non disponibile</div>}
                  </div>
                  <p className="text-[11px] text-[#6e6e73]">Testo renderizzato: <span className="text-[#111111]">{variantPreviews[editingVideoId]?.translatedText || '—'}</span></p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3 text-xs text-[#6e6e73]"><p className="font-semibold text-[#111111]">Metadati variante</p><p className="mt-1">Canale: {privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || '—'}</p><p>Lingua: {variantPreviews[editingVideoId]?.language || '—'}</p><p>Privacy: privata</p></div>
                  <label className="block text-xs font-semibold text-[#111111]">Titolo video</label><input value={editingDraft.title} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, title: event.target.value } : draft)} maxLength={100} className="w-full rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                  <label className="block text-xs font-semibold text-[#111111]">Descrizione video</label><textarea value={editingDraft.description} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, description: event.target.value } : draft)} rows={6} maxLength={5000} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                  <label className="block text-xs font-semibold text-[#111111]">Testo della copertina</label><textarea value={editingDraft.coverText} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, coverText: event.target.value } : draft)} rows={4} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-black/[0.08] pt-4"><Button type="button" variant="outline" className="border-black/[0.10] bg-white text-[#111111] hover:bg-[#f2f2ef]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>Annulla</Button><Button type="button" className="bg-[#111111] text-white hover:bg-[#333333]" onClick={() => void saveVariantEdit()} disabled={isSavingVariantEdit || !editingDraft.coverText.trim()}>{isSavingVariantEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rigenerazione…</> : 'Salva modifica'}</Button></div>
            </div>
          </div>
        )}

        <DialogFooter className="h-[70px] shrink-0 items-center justify-end gap-3 border-t border-black/[0.08] bg-white px-5">
          <Button variant="outline" onClick={handleClose} className="h-10 rounded-[10px] border-black/[0.10] bg-white px-4 text-sm text-[#111111] hover:bg-[#f2f2ef]">Annulla</Button>
          <Button type="button" variant="outline" onClick={() => void handleDownloadAllLanguages()} disabled={isGeneratingPreviews || isApplyingToVideos || Object.keys(variantPreviews).length === 0} className="h-10 rounded-[10px] border-black/[0.10] bg-white px-4 text-sm text-[#111111] hover:bg-[#f2f2ef]">
            <Download className="mr-2 h-4 w-4" />Tutte le lingue
          </Button>
          {targetVideos.length > 0 && <Button type="button" onClick={() => void handleApplyToSelectedVideos()} disabled={isApplyingToVideos || isGeneratingPreviews || !allSelectedVariantsReady} className="h-10 rounded-[10px] bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-black">
            {isApplyingToVideos ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio…</> : <><UploadCloud className="mr-2 h-4 w-4" />Invia al video</>}
          </Button>}
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting || isApplyingToVideos || isGeneratingPreviews} className="h-10 rounded-[10px] bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-black">
            <Download className="mr-2 h-4 w-4" />Esporta PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
