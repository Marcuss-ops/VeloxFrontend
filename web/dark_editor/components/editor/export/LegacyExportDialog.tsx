'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download, Loader2, Youtube, Eye, EyeOff } from 'lucide-react';
import type { UseExportDialogReturn } from '@/hooks/useExportDialog';
import { EXPORT_WIDTH, EXPORT_HEIGHT } from './types';
import { normalizedPlatformAccountId } from './helpers';

/**
 * Dormant legacy export UI (dark theme). Rendered only while the dialog is
 * closed (open === false), so it is never visible in the current InstaEdit
 * flow — the editor mounts ExportDialog only while the publish dialog is
 * open. Preserved 1:1 to avoid behavior changes.
 */
export function LegacyExportDialog({ dialog }: { dialog: UseExportDialogReturn }) {
  const {
    open,
    handleClose,
    hasSelection,
    selectedOnly,
    setSelectedOnly,
    showCoverPreview,
    setShowCoverPreview,
    coverPreviewUrl,
    snapshot,
    canvasSignature,
    snapshotStale,
    youtubeTitle,
    setYoutubeTitle,
    youtubeDescription,
    setYoutubeDescription,
    isTranslatingMetadata,
    metadataTranslationError,
    translatedMetadata,
    translateCompletedMetadata,
    isEditorSession,
    privateVideos,
    selectedVideoIds,
    setSelectedVideoIds,
    latestPrivateVideos,
    isGeneratingPreviews,
    translationLayer,
    loadingPrivateVideos,
    sortedVideos,
    variantPreviews,
    setEditingVideoId,
    setEditingDraft,
    editingVideoId,
    editingDraft,
    isSavingVariantEdit,
    saveVariantEdit,
    isExporting,
    handleExport,
  } = dialog;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[1500px] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Image
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4 lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.25fr)]">


          <div className="min-w-0 space-y-4">
            {/* Export Selection Option */}
            {hasSelection && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectedOnly"
                  checked={selectedOnly}
                  onChange={(e) => setSelectedOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="selectedOnly" className="text-sm">
                  Export selected layer only
                </label>
              </div>
            )}

            {/* Thumbnail preview */}
            <div className="rounded-2xl border border-slate-700 bg-[#0b0d12] p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-white">Copertina</span>
                <span className="text-xs text-slate-400">Anteprima completa del canvas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-medium text-slate-300">{EXPORT_WIDTH} × {EXPORT_HEIGHT}</span>
                <button type="button" onClick={() => setShowCoverPreview((visible) => !visible)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" title={showCoverPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}>
                  {showCoverPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {showCoverPreview && <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
              {/* Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {coverPreviewUrl ? <img src={coverPreviewUrl} alt="Anteprima copertina" className="block h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Anteprima non disponibile</div>}
            </div>}
            {snapshot && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
              <span>Snapshot v{snapshot.version}</span><span>Render {snapshot.width} × {snapshot.height}</span><span>File SHA {snapshot.sha256.slice(0, 12)}</span>
              <span className={snapshot.editorSignature === canvasSignature ? 'text-emerald-300' : 'text-amber-300'}>
                Live canvas {snapshot.editorSignature === canvasSignature ? 'sincronizzato' : 'cambiato'}
              </span>
            </div>}
            {snapshotStale && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span>Il progetto è cambiato. Rigenera le anteprime.</span>
              <span className="text-[10px] font-semibold text-amber-200">Rigenerazione automatica in corso…</span>
            </div>}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-700 bg-[#0b0d12] p-4">
            <div>
              <h3 className="text-sm font-bold text-white">Titolo e descrizione</h3>
              <p className="mt-1 text-[11px] text-slate-400">Le traduzioni partono automaticamente quando completi i campi e clicchi fuori.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Titolo YouTube</label>
              <input value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={100} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-400" placeholder="Titolo del video" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Descrizione</label>
              <textarea value={youtubeDescription} onChange={(event) => setYoutubeDescription(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={5000} rows={5} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-400" placeholder="Descrizione del video" />
              <p className="mt-1 text-[11px] text-slate-400">
                {isTranslatingMetadata ? 'Traduzioni in corso dopo la modifica…' : metadataTranslationError ? metadataTranslationError : Object.keys(translatedMetadata).length > 0 ? 'Traduzioni aggiornate.' : 'Completa titolo e descrizione per tradurre.'}
              </p>
            </div>
            </div>
          </div>

          {/* Project-authorized target context */}
          <div className="min-w-0 space-y-3 lg:border-l lg:border-slate-800 lg:pl-5">
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              <span className="text-sm font-bold text-slate-100">Varianti del target autorizzato</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                {isEditorSession && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                    Video corrente del flusso InstaEdit. Gli eventuali video aggiuntivi arrivano solo dal contesto autorizzato del progetto.
                    {privateVideos[0]?.title && <div className="mt-1 font-semibold">{privateVideos[0].title}</div>}
                  </div>
                )}
                <p className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                  Il target arriva dal contesto di progetto autorizzato da InstaEdit. InstaEditor non gestisce gruppi, canali o pubblicazione.
                </p>

                {/* Video Selection List */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex justify-between items-center text-slate-300">
                    <span>{selectedVideoIds.length} video selezionati</span>
                    {privateVideos.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedVideoIds(latestPrivateVideos.map((video) => video.video_id))}
                          className="text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          Ultimo per canale ({latestPrivateVideos.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const eligibleIds = privateVideos
                              .filter((video) => normalizedPlatformAccountId(video) !== null)
                              .map((video) => video.video_id);
                            setSelectedVideoIds(selectedVideoIds.length === eligibleIds.length ? [] : eligibleIds);
                          }}
                          className="text-xs text-primary hover:underline font-normal"
                        >
                          {selectedVideoIds.length > 0 && selectedVideoIds.length === privateVideos.filter((video) => normalizedPlatformAccountId(video) !== null).length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                        </button>
                      </div>
                    )}
                  </label>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-slate-300">
                    {isGeneratingPreviews ? 'Generazione automatica delle copertine localizzate…' : translationLayer ? `Layer tradotto automaticamente: ${translationLayer.name || translationLayer.text?.slice(0, 42)}` : 'Seleziona un layer testuale nel canvas per generare le varianti.'}
                  </div>

                  {loadingPrivateVideos ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading private videos...
                    </div>
                  ) : privateVideos.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-500/10">
                      Il contesto video autorizzato non è disponibile.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 overflow-y-auto rounded-2xl border border-border/80 bg-slate-950/40 p-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px]">
                      {sortedVideos.map((video) => {
                        const isSelected = selectedVideoIds.includes(video.video_id);
                        const variant = variantPreviews[video.video_id];
                        const hasChannel = normalizedPlatformAccountId(video) !== null;
                        const hasLanguage = Boolean(video.language?.trim());
                        return (
                          <div
                            key={video.video_id}
                            onClick={() => {
                              if (!hasChannel) return;
                              setSelectedVideoIds(prev =>
                                prev.includes(video.video_id)
                                  ? prev.filter(id => id !== video.video_id)
                                  : [...prev, video.video_id]
                              );
                            }}
                            className={`relative flex flex-col rounded-xl overflow-hidden transition-all border group bg-slate-900/50 ${!hasChannel ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-slate-900'} ${
                              isSelected
                                ? 'border-primary shadow-lg ring-1 ring-primary shadow-primary/5'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Selection Check Overlay */}
                            <div className="absolute top-2 left-2 z-20">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-primary border-primary text-white' : 'bg-black/40 border-white/60 text-transparent'
                              }`}>
                                <span className="text-[10px] font-bold">✓</span>
                              </div>
                            </div>

                            {/* Only the final localized cover is shown. It is the
                                same Blob later sent to YouTube. */}
                            <div
                              className="relative aspect-video w-full bg-slate-950 overflow-hidden flex-shrink-0 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!variant) return;
                                setEditingVideoId(video.video_id);
                                setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' });
                              }}
                              title="Clicca per modificare titolo, descrizione e testo della copertina"
                            >
                              {/* Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {variant ? <img src={variant.previewUrl} alt={`Copertina ${variant.language}`} className="w-full h-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-[10px] text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Generazione anteprima…</div>}

                            </div>

                            {/* Video Title and Channel info */}
                            <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900/30">
                              <h4 className={`text-xs font-bold line-clamp-2 leading-tight ${isSelected ? 'text-primary' : 'text-slate-200'}`}>
                                {video.title}
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-2 truncate" title={video.channel_name || video.channel_title || video.channel_id}>
                                {video.channel_id || video.channel_title ? `Canale: ${video.channel_name || video.channel_title || video.channel_id}` : ''}
                              </p>
                              <p className={`mt-1 text-[10px] font-semibold ${hasLanguage ? 'text-slate-400' : 'text-amber-400'}`}>
                                {hasLanguage ? `Lingua: ${video.language}` : 'Lingua: en (fallback)'}
                              </p>
                              {variant && <>
                                <p className="mt-1 truncate text-[10px] text-slate-500" title={variant.sha256}>Variante: {variant.language} · SHA {variant.sha256.slice(0, 10)}</p>
                                <p className="mt-1 line-clamp-2 text-[10px] text-slate-300" title={variant.translatedText}>Testo: {variant.translatedText || '—'}</p>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setEditingVideoId(video.video_id);
                                    setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' });
                                  }}
                                  className="mt-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300"
                                >
                                  Modifica variante
                                </button>
                              </>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {editingVideoId && editingDraft && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!isSavingVariantEdit) { setEditingVideoId(null); setEditingDraft(null); } }}>
            <div className="w-full max-w-xl rounded-2xl border border-black/[0.10] bg-white p-5 text-[#111111] shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Modifica variante target</h3>
                  <p className="mt-1 text-xs text-[#6e6e73]">
                    {privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || editingVideoId} · lingua {variantPreviews[editingVideoId]?.language || '—'} · render 1920 × 1080
                  </p>
                </div>
                <button type="button" className="text-[#6e6e73] hover:text-[#111111]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>✕</button>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#111111]">Titolo video</label>
                <input value={editingDraft.title} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, title: event.target.value } : draft)} maxLength={100} className="w-full rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                <label className="block text-xs font-semibold text-[#111111]">Descrizione video</label>
                <textarea value={editingDraft.description} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, description: event.target.value } : draft)} rows={5} maxLength={5000} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                <label className="block text-xs font-semibold text-[#111111]">Testo della copertina</label>
                <textarea value={editingDraft.coverText} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, coverText: event.target.value } : draft)} rows={3} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                <p className="text-[11px] text-[#6e6e73]">Salvando viene rigenerato il file 1920 × 1080 di questo solo canale; quel file sarà quello caricato.</p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" className="border-black/[0.10] bg-white text-[#111111] hover:bg-[#f2f2ef]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>Annulla</Button>
                <Button type="button" className="bg-[#111111] text-white hover:bg-[#333333]" onClick={() => void saveVariantEdit()} disabled={isSavingVariantEdit || !editingDraft.coverText.trim()}>
                  {isSavingVariantEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rigenerazione…</> : 'Salva modifica'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Annulla
          </Button>
          <Button
            onClick={() => void handleExport()}
            disabled={isExporting || isGeneratingPreviews}
            className="w-full sm:w-auto"
          >
            {(isExporting || isGeneratingPreviews) ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isGeneratingPreviews ? 'Generazione anteprime…' : 'Exporting...'}</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Export</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
