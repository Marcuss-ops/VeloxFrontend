'use client';

import React from 'react';
import { Play, MoreVertical, Compass, Home, Clock } from 'lucide-react';

interface MobileFeedPreviewProps {
  previewUrl: string | null;
  videoTitle: string;
  channelName: string;
  viewCount: string;
  publishTime: string;
}

/** MobileFeedPreview — the simulated YouTube mobile feed for the preview dialog. */
export function MobileFeedPreview({
  previewUrl,
  videoTitle,
  channelName,
  viewCount,
  publishTime,
}: MobileFeedPreviewProps) {
  return (
    <div className="w-[375px] border-[8px] border-slate-800 rounded-[40px] bg-[#0f0f0f] shadow-2xl overflow-hidden flex flex-col h-[650px] relative">
      {/* Mobile Header Bar */}
      <div className="h-10 bg-black/95 px-5 flex items-center justify-between text-xs text-slate-400 font-medium z-10">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded bg-slate-400 block scale-75"></span>
          <span className="w-3.5 h-3.5 rounded bg-slate-400 block scale-75"></span>
        </div>
      </div>

      {/* Simulated Youtube App Header */}
      <div className="h-12 border-b border-slate-900 bg-[#0f0f0f] px-4 flex items-center justify-between shrink-0">
        <span className="text-red-600 font-black tracking-tighter text-lg flex items-center gap-0.5">
          <Play className="w-5 h-5 fill-red-600" /> YouTube
        </span>
        <div className="flex items-center gap-4 text-white">
          <span className="text-[11px] font-bold bg-slate-800 px-2 py-0.5 rounded-full">Preview</span>
        </div>
      </div>

      {/* Mobile Feed Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {/* Our Video Card (Highlight Mode) */}
        <div className="border-b-4 border-slate-900 bg-primary/5 p-3 flex flex-col gap-2">
          <div className="relative aspect-video w-full bg-slate-800 rounded-lg overflow-hidden shadow-inner">
            {previewUrl ? (
              // Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Generated Preview" className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                Generating thumbnail...
              </div>
            )}
            <span className="absolute bottom-2 right-2 bg-black/85 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
              --
            </span>
          </div>

          <div className="flex gap-2.5 mt-1">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 shrink-0">
              {(channelName || '—').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">
                {videoTitle || 'Titolo non impostato'}
              </h4>
              <div className="text-[10px] text-[#aaa] mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{channelName || 'Canale non impostato'}</span>
                <span className="before:content-['•'] before:mr-1.5">{viewCount || '—'}</span>
                <span className="before:content-['•'] before:mr-1.5">{publishTime || '—'}</span>
              </div>
            </div>
            <button className="text-slate-400 p-1">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-b-4 border-slate-900 p-3 text-center text-xs text-slate-500">
          Nessun altro video viene mostrato: il contesto del feed deve arrivare da InstaEdit.
        </div>
      </div>

      {/* Mobile App Bottom Tab Bar */}
      <div className="absolute bottom-0 inset-x-0 h-12 bg-black/95 border-t border-slate-900 flex items-center justify-around text-[9px] text-slate-500">
        <div className="flex flex-col items-center gap-0.5 text-white">
          <Home className="w-4 h-4" />
          <span>Home</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Compass className="w-4 h-4" />
          <span>Explore</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Clock className="w-4 h-4" />
          <span>Library</span>
        </div>
      </div>
    </div>
  );
}
