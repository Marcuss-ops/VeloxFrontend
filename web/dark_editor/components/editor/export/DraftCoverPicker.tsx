'use client';

import { Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { ThumbnailProjectDraft } from '@/lib/api/bff';

interface DraftCoverPickerProps {
  drafts: Array<ThumbnailProjectDraft & { previewUrl?: string }>;
  selectedDraftId?: string;
  loading: boolean;
  onSelect: (draft?: ThumbnailProjectDraft & { previewUrl?: string }) => void;
}

export function DraftCoverPicker({ drafts, selectedDraftId, loading, onSelect }: DraftCoverPickerProps) {
  if (loading) return <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white p-3 text-xs text-black/55"><Loader2 className="h-4 w-4 animate-spin" />Carico le bozze del gruppo…</div>;
  if (drafts.length === 0) return null;
  return (
    <div className="space-y-3 rounded-xl border border-black/[0.08] bg-white p-3">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-semibold">Bozze del gruppo</p><p className="text-xs text-black/55">Selezionane una per pubblicarla come copertina.</p></div>
        {selectedDraftId && <button type="button" onClick={() => onSelect()} className="text-xs text-black/60 underline">Usa anteprima corrente</button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {drafts.map((draft) => {
          const selected = draft.id === selectedDraftId;
          return <button key={draft.id} type="button" onClick={() => onSelect(draft)} className={`relative overflow-hidden rounded-lg border text-left ${selected ? 'border-black ring-2 ring-black/15' : 'border-black/[0.10]'}`}>
            {draft.previewUrl ? <img src={draft.previewUrl} alt={draft.name} className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-[#f0f0ed]"><ImageIcon className="h-6 w-6 text-black/25" /></div>}
            <span className="block truncate px-2 py-1.5 text-xs font-medium">{draft.name}</span>
            {selected && <span className="absolute right-2 top-2 rounded-full bg-black p-1 text-white"><Check className="h-3 w-3" /></span>}
          </button>;
        })}
      </div>
    </div>
  );
}
