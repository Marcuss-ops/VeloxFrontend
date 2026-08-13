'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface FeedPreviewSettingsProps {
  videoTitle: string;
  channelName: string;
  viewCount: string;
  publishTime: string;
  onVideoTitleChange: (value: string) => void;
  onChannelNameChange: (value: string) => void;
  onViewCountChange: (value: string) => void;
  onPublishTimeChange: (value: string) => void;
  onClose: () => void;
}

/** FeedPreviewSettings — the metadata inputs + close button of the preview dialog. */
export function FeedPreviewSettings({
  videoTitle,
  channelName,
  viewCount,
  publishTime,
  onVideoTitleChange,
  onChannelNameChange,
  onViewCountChange,
  onPublishTimeChange,
  onClose,
}: FeedPreviewSettingsProps) {
  return (
    <div className="w-[320px] border-l border-slate-800 bg-slate-950 p-6 flex flex-col gap-5 justify-between">
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Simulation Details</h4>
          <p className="text-[11px] text-slate-400 mt-1">Customize the metadata of your video preview card.</p>
        </div>

        {/* Video Title Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Video Title</label>
          <textarea
            value={videoTitle}
            onChange={(e) => onVideoTitleChange(e.target.value)}
            className="w-full h-20 text-xs bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-primary text-white resize-none"
            placeholder="Titolo del video..."
          />
        </div>

        {/* Channel Name Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Channel Name</label>
          <Input
            value={channelName}
            onChange={(e) => onChannelNameChange(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-800 rounded-xl"
            placeholder="Nome del canale da InstaEdit..."
          />
        </div>

        {/* View Count Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Views Display</label>
          <Input
            value={viewCount}
            onChange={(e) => onViewCountChange(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-800 rounded-xl"
            placeholder="Lascia vuoto se non disponibile"
          />
        </div>

        {/* Time Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Publish Time Display</label>
          <Input
            value={publishTime}
            onChange={(e) => onPublishTimeChange(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-800 rounded-xl"
            placeholder="Lascia vuoto se non disponibile"
          />
        </div>
      </div>

      <Button
        onClick={onClose}
        className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all text-xs"
      >
        Back to Canvas Editor
      </Button>
    </div>
  );
}
