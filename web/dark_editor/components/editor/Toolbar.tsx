'use client';

import React from 'react';
import Image from 'next/image';
import { useProjectStore } from '@/stores/projectStore';
import { Loader2, Check } from 'lucide-react';

export default function Toolbar() {
  const { isDirty, isSaving } = useProjectStore();
  
  return (
    <div className="flex items-center gap-4">
      {/* Auto-save status indicator */}
      <div className="flex items-center gap-1.5 text-xs font-semibold select-none tabular-nums text-slate-500">
        {isSaving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>Saving...</span>
          </>
        ) : isDirty ? (
          <>
            <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Unsaved changes</span>
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Saved</span>
          </>
        )}
      </div>
    </div>
  );
}
