'use client';

import React from 'react';

/**
 * Early-return screens for the editor workspace: the initial loading
 * spinner and the fatal error state. Both are pure presentational and
 * receive their copy/theme from EditorWorkspace.
 */
export function EditorLoadingState({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div className={`relative h-screen overflow-hidden ${isDarkTheme ? 'bg-[#111318] text-white' : 'bg-[#f7f7f5] text-[#111111]'}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${isDarkTheme ? 'bg-violet-500/[0.08]' : 'bg-violet-500/[0.06]'}`} />
      </div>
      <div className="relative flex h-full flex-col items-center justify-center px-6">
        <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xl ${isDarkTheme ? 'border-white/10 bg-white/[0.06] shadow-black/30' : 'border-black/[0.08] bg-white shadow-black/5'}`}>
          <div className={`h-6 w-6 animate-spin rounded-full border-[3px] border-t-transparent ${isDarkTheme ? 'border-white/25 border-t-white' : 'border-black/15 border-t-black'}`} />
        </div>
        <div className="w-full max-w-sm text-center">
          <h1 className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-[#171717]'}`}>Preparing your canvas</h1>
          <p className={`mt-2 text-sm ${isDarkTheme ? 'text-white/50' : 'text-[#6e6e73]'}`}>Loading the project and restoring your latest draft…</p>
          <div className={`mx-auto mt-6 h-1.5 w-full overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-black/[0.08]'}`}>
            <div className={`h-full w-1/3 animate-[loading-progress_1.4s_ease-in-out_infinite] rounded-full ${isDarkTheme ? 'bg-white/70' : 'bg-black/55'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorErrorState({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#f7f7f5] px-6 text-[#111111]">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-8 text-center shadow-xl shadow-black/[0.05]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">!</div>
        <h1 className="text-lg font-semibold">This editor session is no longer available</h1>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/80"
        >
          Back to Covers
        </button>
      </div>
    </div>
  );
}
