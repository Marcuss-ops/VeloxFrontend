'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BatchVideo, RenderedVariant } from './types';

interface VariantEditModalProps {
  editingVideoId: string | null;
  editingDraft: { title: string; description: string; coverText: string } | null;
  setEditingVideoId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingDraft: React.Dispatch<React.SetStateAction<{ title: string; description: string; coverText: string } | null>>;
  privateVideos: BatchVideo[];
  variantPreviews: Record<string, RenderedVariant>;
  isSavingVariantEdit: boolean;
  saveVariantEdit: () => Promise<void>;
}

/**
 * Fixed overlay that edits a single target's localized variant (title,
 * description, cover text) and re-renders the 1920×1080 cover for that
 * channel only. Renders nothing while no variant is being edited.
 */
export function VariantEditModal({
  editingVideoId,
  editingDraft,
  setEditingVideoId,
  setEditingDraft,
  privateVideos,
  variantPreviews,
  isSavingVariantEdit,
  saveVariantEdit,
}: VariantEditModalProps) {
  if (!editingVideoId || !editingDraft) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!isSavingVariantEdit) { setEditingVideoId(null); setEditingDraft(null); } }}>
      <div className="max-h-[94vh] w-[min(1280px,96vw)] max-w-6xl overflow-y-auto rounded-2xl border border-black/[0.10] bg-white p-6 text-[#111111] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold text-[#111111]">Modifica variante target</h3><p className="mt-1 text-xs text-[#6e6e73]">{privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || editingVideoId} · lingua {variantPreviews[editingVideoId]?.language || '—'} · render 1920 × 1080</p></div><button type="button" className="text-[#6e6e73] hover:text-[#111111]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>✕</button></div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#6e6e73]">Anteprima cover tradotta</span><span className="rounded-md border border-black/[0.08] bg-[#f7f7f5] px-2 py-1 text-[10px] text-[#6e6e73]">1920 × 1080 · {variantPreviews[editingVideoId]?.language || '—'}</span></div>
            <div className="overflow-hidden rounded-xl border border-black/[0.10] bg-[#111111]">
              {/* Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
  );
}

export default VariantEditModal;
