'use client';

import React from 'react';
import { Download, Loader2, UploadCloud } from 'lucide-react';
import { DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { BatchVideo, RenderedVariant } from './types';

interface PublishFooterProps {
  handleClose: () => void;
  handleDownloadAllLanguages: () => Promise<void>;
  isGeneratingPreviews: boolean;
  isApplyingToVideos: boolean;
  variantPreviews: Record<string, RenderedVariant>;
  targetVideos: BatchVideo[];
  handleApplyToSelectedVideos: () => Promise<void>;
  allSelectedVariantsReady: boolean;
  handleExport: () => Promise<void>;
  isExporting: boolean;
}

/**
 * Dialog footer of the publish dialog: cancel, download-all-languages,
 * apply-to-selected-videos and export PNG actions with their busy states.
 */
export function PublishFooter({
  handleClose,
  handleDownloadAllLanguages,
  isGeneratingPreviews,
  isApplyingToVideos,
  variantPreviews,
  targetVideos,
  handleApplyToSelectedVideos,
  allSelectedVariantsReady,
  handleExport,
  isExporting,
}: PublishFooterProps) {
  return (
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
  );
}

export default PublishFooter;
