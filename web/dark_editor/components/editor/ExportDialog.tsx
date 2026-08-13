'use client';

import React from 'react';
import { useExportDialog } from '@/hooks/useExportDialog';
import { PublishExportDialog } from './export/PublishExportDialog';
import type { ExportDialogProps } from './export/types';

/**
 * Export / publish dialog. Composition root: the entire flow state and
 * logic lives in useExportDialog; this component only picks the panel:
 *   - open → the live publish-flow UI (PublishExportDialog)
 *   - closed → nothing (the dormant legacy UI was removed)
 */
export default function ExportDialog(props: ExportDialogProps) {
  const dialog = useExportDialog(props);

  if (dialog.open) return <PublishExportDialog dialog={dialog} />;
  return null;
}
