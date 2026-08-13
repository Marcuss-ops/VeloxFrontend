'use client';

import React from 'react';
import { Play } from 'lucide-react';

interface DesktopFeedPreviewProps {
  previewUrl: string | null;
  videoTitle: string;
  channelName: string;
  viewCount: string;
  publishTime: string;
}

/** DesktopFeedPreview — the simulated YouTube desktop feed for the preview dialog. */
export function DesktopFeedPreview({
  previewUrl,
  videoTitle,
  channelName,
  viewCount,
  publishTime,
}: DesktopFeedPreviewProps) {
  return (
    <div className="w-full max-w-[1000px] text-white">
      {/* Simulated YouTube Search Bar */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/60 opacity-60">
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-bold tracking-tighter text-xl flex items-center gap-1">
            <Play className="w-6 h-6 fill-red-600" /> YouTube
          </span>
        </div>
        <div className="w-96 h-9 bg-[#222222] border border-[#303030] rounded-full flex items-center px-4 text-sm text-slate-400">
          Search
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-700"></div>
      </div>

      <h3 className="text-lg font-bold mb-4 tracking-tight">Recommended Feed</h3>

      {/* The preview shows only the current project. No fake feed/catalog data is rendered. */}
      <div className="grid grid-cols-1 gap-4">
        {/* Our active canvas preview video card */}
        <div className="flex flex-col gap-2 group cursor-pointer border border-primary/20 bg-primary/5 rounded-2xl p-2 shadow-[0_0_20px_rgba(var(--color-primary),0.05)] ring-2 ring-primary/40">
          <div className="relative aspect-video w-full bg-slate-800 rounded-xl overflow-hidden shadow-md">
            {previewUrl ? (
              // Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Generated Preview" className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                Generating thumbnail...
              </div>
            )}
            <span className="absolute bottom-2 right-2 bg-black/85 text-[11px] font-medium px-1.5 py-0.5 rounded text-white tracking-wider">
              --
            </span>
          </div>

          <div className="flex gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/30 shrink-0">
              {(channelName || '—').slice(0, 2)}
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2 hover:text-slate-100">
                {videoTitle || 'Titolo non impostato'}
              </h4>
              <span className="text-[12px] text-[#aaa] mt-1 hover:text-white transition-colors">
                {channelName || 'Canale non impostato'}
              </span>
              <div className="text-[12px] text-[#aaa] mt-0.5 flex items-center gap-1.5">
                <span>{viewCount || '--'}</span>
                <span className="before:content-['•'] before:mr-1.5">{publishTime || '--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
