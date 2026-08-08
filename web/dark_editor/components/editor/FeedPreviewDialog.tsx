'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Smartphone, Monitor, Eye, Play, MoreVertical, Compass, Home, Clock } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { exportStageToBlob } from '@/lib/canvasExport';

interface FeedPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Capture the canonical Konva stage, never the viewport canvas. */
  canvasRef?: React.RefObject<any>;
}

export default function FeedPreviewDialog({ isOpen, onClose, canvasRef }: FeedPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  // Preview metadata is intentionally blank until InstaEdit supplies real project context.
  const [videoTitle, setVideoTitle] = useState('');
  const [channelName, setChannelName] = useState('');
  const [viewCount, setViewCount] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
      return;
    }

    const stage = canvasRef?.current?.getStage?.();
    if (!stage) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { canvasWidth, canvasHeight } = useEditorStore.getState();
        const result = await exportStageToBlob(stage, canvasWidth, canvasHeight, 'png', 100);
        if (cancelled) return;
        if (!result) {
          setPreviewUrl(null);
          return;
        }
        if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
        const url = URL.createObjectURL(result.blob);
        previewObjectUrlRef.current = url;
        setPreviewUrl(url);
      } catch (error) {
        console.error('Failed to capture canonical canvas for feed preview', error);
        if (!cancelled) setPreviewUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canvasRef, isOpen]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-900 border border-slate-800 text-white rounded-3xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">YouTube Feed Simulator</DialogTitle>
              <p className="text-xs text-slate-400">Preview how your thumbnail matches YouTube&apos;s context</p>
            </div>
          </div>

          {/* Toggle Devices */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'desktop'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>
        </div>

        {/* Content body split into preview and settings */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left panel: Simulator view */}
          <div className="flex-1 bg-[#0f0f0f] overflow-y-auto p-6 flex items-start justify-center custom-scrollbar">
            
            {deviceMode === 'desktop' ? (
              /* Youtube Desktop Feed */
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
            ) : (
              /* Youtube Mobile Feed Simulator */
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
            )}

          </div>

          {/* Right panel: Custom settings */}
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
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full h-20 text-xs bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-primary text-white resize-none"
                  placeholder="Titolo del video..."
                />
              </div>

              {/* Channel Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Channel Name</label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="text-xs bg-slate-900 border border-slate-800 rounded-xl"
                  placeholder="Nome del canale da InstaEdit..."
                />
              </div>

              {/* View Count Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Views Display</label>
                <Input
                  value={viewCount}
                  onChange={(e) => setViewCount(e.target.value)}
                  className="text-xs bg-slate-900 border border-slate-800 rounded-xl"
                  placeholder="Lascia vuoto se non disponibile"
                />
              </div>

              {/* Time Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Publish Time Display</label>
                <Input
                  value={publishTime}
                  onChange={(e) => setPublishTime(e.target.value)}
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

        </div>

      </DialogContent>
    </Dialog>
  );
}
