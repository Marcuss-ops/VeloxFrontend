'use client';

import { useUIStore } from '@/stores/uiStore';
import { Share2 } from 'lucide-react';
import { DockItem } from './DockItem';

/**
 * ActionsSection — the toolbar dock's terminal actions (export). Extracted
 * from ToolbarDock.tsx; new global actions (publish, share, …) belong here.
 */
export function ActionsSection() {
  const { setExportDialog } = useUIStore();

  const openExport = () => setExportDialog(true);

  return (
    <div className="rounded-xl bg-white p-1 ring-1 ring-black/[0.05] dark:bg-[#242832] dark:ring-white/10">
      <DockItem
        icon={<Share2 className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label="Export"
        onClick={openExport}
      />
    </div>
  );
}
