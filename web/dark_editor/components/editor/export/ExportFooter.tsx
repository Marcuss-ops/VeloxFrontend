'use client';

import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ExportFooterProps {
  onClose: () => void;
  onExport: () => void;
  onDownloadCopy: () => void;
  isProcessing: boolean;
  exportComplete: boolean;
  hasExportedBlob: boolean;
  processingLabel?: string;
  exportLabel?: string;
}

export function ExportFooter({
  onClose,
  onExport,
  onDownloadCopy,
  isProcessing,
  exportComplete,
  hasExportedBlob,
  processingLabel = 'Exporting…',
  exportLabel = 'Export',
}: ExportFooterProps) {
  if (exportComplete) {
    return (
      <>
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Done
        </Button>
        {hasExportedBlob ? (
          <Button
            variant="secondary"
            onClick={onDownloadCopy}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Copy
          </Button>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
        Cancel
      </Button>
      <Button
        onClick={onExport}
        disabled={isProcessing}
        className="w-full sm:w-auto"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {processingLabel}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {exportLabel}
          </>
        )}
      </Button>
    </>
  );
}

export default ExportFooter;
