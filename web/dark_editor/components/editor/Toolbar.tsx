'use client';

import React from 'react';
import Image from 'next/image';
import { useProjectStore } from '@/stores/projectStore';
import { Loader2, Check } from 'lucide-react';

export default function Toolbar() {
  const { isDirty, isSaving } = useProjectStore();
  
  return (
    <div className="flex items-center gap-3 rounded-full border border-black/[0.08] bg-white px-3 py-1.5">
      {/* Auto-save status indicator */}
      <div className="flex select-none items-center gap-1.5 text-[11px] font-semibold tabular-nums text-[#6e6e73]">
        {isSaving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#111111]" />
            <span>Salvataggio…</span>
          </>
        ) : isDirty ? (
          <>
            <div className="size-1.5 animate-pulse rounded-full bg-[#111111]" />
            <span>Modifiche non salvate</span>
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5 text-[#111111]" />
            <span>Salvato</span>
          </>
        )}
      </div>
    </div>
  );
}
