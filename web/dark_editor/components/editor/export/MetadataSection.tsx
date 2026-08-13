'use client';

import React from 'react';
import type { LocalizedMetadata } from './types';

interface MetadataSectionProps {
  youtubeTitle: string;
  setYoutubeTitle: React.Dispatch<React.SetStateAction<string>>;
  youtubeDescription: string;
  setYoutubeDescription: React.Dispatch<React.SetStateAction<string>>;
  isTranslatingMetadata: boolean;
  metadataTranslationError: string;
  translatedMetadata: Record<string, LocalizedMetadata>;
  translateCompletedMetadata: () => Promise<void>;
}

/**
 * Left-column metadata block of the publish dialog: title + description
 * inputs (translation kicks in on blur) with the live translation status
 * line underneath.
 */
export function MetadataSection({
  youtubeTitle,
  setYoutubeTitle,
  youtubeDescription,
  setYoutubeDescription,
  isTranslatingMetadata,
  metadataTranslationError,
  translatedMetadata,
  translateCompletedMetadata,
}: MetadataSectionProps) {
  return (
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
  );
}

export default MetadataSection;
