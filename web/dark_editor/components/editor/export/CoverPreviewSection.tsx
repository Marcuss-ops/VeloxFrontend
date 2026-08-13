'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface CoverPreviewSectionProps {
  hasSelection: boolean;
  selectedOnly: boolean;
  setSelectedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  showCoverPreview: boolean;
  setShowCoverPreview: React.Dispatch<React.SetStateAction<boolean>>;
  coverPreviewUrl: string;
  snapshotStale: boolean;
}

/**
 * Left-column top block of the publish dialog: the "export selected layer
 * only" option, the cover preview card (toggle + image + stale banner) and
 * the fixed YouTube preset card (1920×1080, 16:9, PNG lossless).
 */
export function CoverPreviewSection({
  hasSelection,
  selectedOnly,
  setSelectedOnly,
  showCoverPreview,
  setShowCoverPreview,
  coverPreviewUrl,
  snapshotStale,
}: CoverPreviewSectionProps) {
  return (
    <>
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
            {/* Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
    </>
  );
}

export default CoverPreviewSection;
