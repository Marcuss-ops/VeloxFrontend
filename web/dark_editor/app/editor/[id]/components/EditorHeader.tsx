'use client';

import React from 'react';
import { Home, Maximize2, Minimize2, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeProvider';
import type { EditorTab } from '@/stores/editorTabsStore';

export interface EditorHeaderProps {
  tabs: EditorTab[];
  activeTabId: string;
  projectName: string;
  returnUrl: string;
  isDarkTheme: boolean;
  isFullscreen: boolean;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onNameBlur: () => void;
  onToggleFullscreen: () => void;
}

/**
 * Floating top-left navigation pill: open editor tabs, the Home / back link
 * to the Copertine hub, the project name pill and the fullscreen + theme
 * controls. Pure presentational — all state and handlers come from props.
 */
export default function EditorHeader({
  tabs,
  activeTabId,
  projectName,
  returnUrl,
  isDarkTheme,
  isFullscreen,
  onSwitchTab,
  onCloseTab,
  onNameChange,
  onNameBlur,
  onToggleFullscreen,
}: EditorHeaderProps) {
  return (
    <div
      className={`editor-header absolute left-4 top-4 z-30 flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-xl ${isDarkTheme ? 'border-white/10 bg-[#17191f]/95' : 'border-black/[0.08] bg-white/[0.96]'}`}
    >
      <div className="flex max-w-[360px] items-center gap-1 overflow-x-auto pr-1">
        {tabs.map((tab) => (
          <div key={tab.id} className={`group flex shrink-0 items-center rounded-lg border ${tab.id === activeTabId ? (isDarkTheme ? 'border-white/20 bg-white/10' : 'border-black/15 bg-black/[0.05]') : (isDarkTheme ? 'border-transparent' : 'border-transparent')} `}>
            <button type="button" onClick={() => onSwitchTab(tab.id)} className="max-w-[130px] truncate px-2 py-1 text-[10px] font-semibold text-[#4c4c50] hover:text-[#111111] dark:text-white/65 dark:hover:text-white" title={tab.name}>{tab.name}</button>
            <button type="button" onClick={() => onCloseTab(tab.id)} className="mr-0.5 rounded p-0.5 text-[#9a9a9f] hover:bg-black/10 hover:text-[#111111] dark:hover:bg-white/10 dark:hover:text-white" title="Chiudi copertina" aria-label={`Chiudi ${tab.name}`}><X className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
      {/* Back to the InstaEdit Copertine hub of the group the user
          opened the editor from (relative return_to stamped by the
          SPA launch URL; falls back to the hub without a group). */}
      <a
        href={returnUrl}
        className={isDarkTheme ? 'text-white/65 transition-colors hover:text-white' : 'text-black/60 transition-colors hover:text-black'}
        title="Torna a Copertine"
      >
        <Home className="h-5 w-5" />
      </a>
      <span className={isDarkTheme ? 'select-none text-sm text-white/30' : 'select-none text-sm text-black/30'}>/</span>
      <div className="group relative max-w-[240px]">
        <input
          type="text"
          value={projectName}
          onChange={onNameChange}
          onBlur={onNameBlur}
          placeholder="Senza nome"
          className={`w-full truncate rounded border-none bg-transparent px-1 py-1 text-sm font-semibold placeholder:italic transition-all duration-200 focus:outline-none focus:ring-1 ${isDarkTheme ? 'text-white placeholder:text-white/35 focus:bg-white/[0.06] focus:ring-white/15' : 'text-[#111111] placeholder:text-black/35 focus:bg-black/[0.03] focus:ring-black/10'}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      </div>
      <button
        type="button"
        onClick={onToggleFullscreen}
        className={isDarkTheme ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white' : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-black/[0.06] hover:text-black'}
        title={isFullscreen ? 'Esci da fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Esci da fullscreen' : 'Attiva fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      <ThemeToggle />
    </div>
  );
}
