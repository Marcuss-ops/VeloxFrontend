'use client';

import { History, RotateCcw, X } from 'lucide-react';
import type { EditorVersion } from '@/hooks/useEditorVersionHistory';

interface VersionHistoryPanelProps {
  versions: EditorVersion[];
  onRestore: (version: EditorVersion) => void;
  onClose: () => void;
  isDarkTheme: boolean;
}

export default function VersionHistoryPanel({ versions, onRestore, onClose, isDarkTheme }: VersionHistoryPanelProps) {
  return (
    <aside className={`absolute left-4 top-[74px] z-40 w-[300px] overflow-hidden rounded-2xl border shadow-xl ${isDarkTheme ? 'border-white/10 bg-[#17191f] text-white' : 'border-black/[0.08] bg-white text-[#111111]'}`}>
      <div className="flex items-center justify-between border-b border-black/[0.08] px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2"><History className="h-4 w-4" /><span className="text-sm font-semibold">Cronologia versioni</span></div>
        <button type="button" onClick={onClose} aria-label="Chiudi cronologia"><X className="h-4 w-4 opacity-60" /></button>
      </div>
      <div className="max-h-[min(430px,60vh)] overflow-y-auto p-2">
        {versions.length === 0 ? <p className="px-3 py-5 text-xs opacity-60">Le versioni appariranno mentre lavori.</p> : versions.map((version, index) => (
          <div key={version.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]">
            <div><p className="text-xs font-medium">{index === 0 ? 'Versione corrente' : `Versione ${versions.length - index}`}</p><p className="text-[10px] opacity-55">{new Date(version.createdAt).toLocaleString('it-IT')}</p></div>
            <button type="button" onClick={() => onRestore(version)} className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-[10px] font-semibold hover:bg-black/[0.06] dark:border-white/15 dark:hover:bg-white/10"><RotateCcw className="h-3 w-3" />Ripristina</button>
          </div>
        ))}
      </div>
    </aside>
  );
}
