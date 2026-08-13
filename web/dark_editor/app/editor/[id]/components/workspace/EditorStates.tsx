'use client';

import React from 'react';

/**
 * Early-return screens for the editor workspace: the initial loading
 * spinner and the fatal error state. Both are pure presentational and
 * receive their copy/theme from EditorWorkspace.
 */
export function EditorLoadingState({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div className={`h-screen flex items-center justify-center ${isDarkTheme ? 'bg-[#111318] text-white' : 'bg-[#f7f7f5] text-[#111111]'}`}>
      <div className="text-center">
        <div className={`mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 ${isDarkTheme ? 'border-white' : 'border-[#111111]'}`}></div>
        <p className={isDarkTheme ? 'text-white/60' : 'text-[#6e6e73]'}>Loading project...</p>
      </div>
    </div>
  );
}

export function EditorErrorState({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="h-screen flex items-center justify-center bg-[#f7f7f5] text-[#111111]">
      <div className="text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <button
          onClick={onBack}
          className="text-[#111111] underline-offset-2 hover:underline"
        >
          Torna a Copertine
        </button>
      </div>
    </div>
  );
}
