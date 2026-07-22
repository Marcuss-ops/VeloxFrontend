'use client';

import React, { useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Home, Upload } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useProjectLoader } from '@/hooks/useProjectLoader';
import { useProjectSave } from '@/hooks/useProjectSave';
import { useDragDropUpload } from '@/hooks/useDragDropUpload';
import { useKeyboard } from '@/hooks/useKeyboard';
import EditorSidebar from '@/components/editor/sidebar/EditorSidebar';
import ToolbarDock from './components/ToolbarDock';
import ExportDialog from '@/components/editor/ExportDialog';
import AIDialog from '@/components/editor/AIDialog';
import YouTubeDialog from '@/components/editor/YouTubeDialog';
import FeedPreviewDialog from '@/components/editor/FeedPreviewDialog';

const Canvas = dynamic(() => import('@/components/editor/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#eaedf0] dark:bg-[#0a0f14]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

function generateRandomName() {
  const adjectives = ['Vibrant', 'Neon', 'Cosmic', 'Electric', 'Stealth', 'Hyper', 'Sonic', 'Golden', 'Pixel', 'Astro'];
  const nouns = ['Nebula', 'Blade', 'Vortex', 'Spark', 'Zenith', 'Echo', 'Pulse', 'Wave', 'Grid', 'Forge'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 99) + 1;
  return `${randomAdj}-${randomNoun}-${randomNumber}`;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { loading, error } = useProjectLoader(projectId);
  useKeyboard();
  const canvasRef = useRef<any>(null);
  useProjectSave(canvasRef);
  const { isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useDragDropUpload();

  const { currentProject, updateProjectName } = useProjectStore();
  const { addToast } = useUIStore();
  const { showExportDialog, showAIDialog, showYouTubeDialog, showFeedPreviewDialog, setFeedPreviewDialog } = useUIStore();

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProjectName(e.target.value);
  };

  const handleProjectNameBlur = () => {
    if (!currentProject?.name?.trim()) {
      const randomName = generateRandomName();
      updateProjectName(randomName);
      addToast({ type: 'info', message: `Empty name? Let's call it "${randomName}"! ✨` });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-primary hover:underline">
            Go back to projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-background-light dark:bg-background-dark overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary flex flex-col items-center justify-center p-12 pointer-events-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 scale-110 border border-primary/20">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary animate-bounce">
              <Upload className="w-10 h-10" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Drop to Upload</h3>
              <p className="text-slate-500 dark:text-slate-400">Release your images to add them to the canvas</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative h-screen">
        <main className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-12 mr-[30px]">
          <div className="absolute top-6 left-6 z-30 glass-dock px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-dock">
            <Link href="/" className="text-slate-450 hover:text-white transition-colors" title="Home">
              <Home className="w-4 h-4" />
            </Link>
            <span className="text-slate-650 select-none text-xs">/</span>
            <div className="relative group max-w-[180px]">
              <input
                type="text"
                value={currentProject?.name || ''}
                onChange={handleProjectNameChange}
                onBlur={handleProjectNameBlur}
                placeholder="Senza nome"
                className="bg-transparent border-none text-xs font-semibold text-slate-200 focus:outline-none focus:bg-white/[0.04] focus:ring-1 focus:ring-sky-500/30 rounded px-1.5 py-0.5 placeholder:italic w-full truncate transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </div>
          </div>

          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

          <div className="relative aspect-video w-full max-w-4xl bg-white dark:bg-slate-900 canvas-shadow rounded-sm overflow-hidden border border-slate-200 dark:border-slate-800 z-10">
            <Canvas canvasRef={canvasRef} />
          </div>

          <ToolbarDock />
        </main>

        <EditorSidebar />
      </div>

      {showExportDialog && <ExportDialog />}
      {showAIDialog && <AIDialog />}
      {showYouTubeDialog && <YouTubeDialog />}
      <FeedPreviewDialog isOpen={showFeedPreviewDialog} onClose={() => setFeedPreviewDialog(false)} />
    </div>
  );
}
