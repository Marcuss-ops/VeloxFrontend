'use client';

import React from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { BatchVideo } from './types';

interface PublishFooterProps {
  handleClose: () => void;
  isGeneratingPreviews: boolean;
  isApplyingToVideos: boolean;
  targetVideos: BatchVideo[];
  handleApplyToSelectedVideos: () => Promise<void>;
  allSelectedVariantsReady: boolean;
  selectedDraftId?: string;
}

/**
 * Dialog footer of the publish dialog. Covers are sent directly to YouTube.
 */
export function PublishFooter({
  handleClose,
  isGeneratingPreviews,
  isApplyingToVideos,
  targetVideos,
  handleApplyToSelectedVideos,
  allSelectedVariantsReady,
  selectedDraftId,
}: PublishFooterProps) {
  return (
    <DialogFooter className="h-[70px] shrink-0 items-center justify-end gap-3 border-t border-black/[0.08] bg-white px-5">
      <Button variant="outline" onClick={handleClose} className="h-10 rounded-[10px] border-black/[0.10] bg-white px-4 text-sm text-[#111111] hover:bg-[#f2f2ef]">Annulla</Button>
      {targetVideos.length > 0 && <Button type="button" onClick={() => void handleApplyToSelectedVideos()} disabled={isApplyingToVideos || isGeneratingPreviews || (!selectedDraftId && !allSelectedVariantsReady)} className="h-10 rounded-[10px] bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-black">
        {isApplyingToVideos ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio…</> : <><UploadCloud className="mr-2 h-4 w-4" />Invia al video</>}
      </Button>}
    </DialogFooter>
  );
}

export default PublishFooter;
