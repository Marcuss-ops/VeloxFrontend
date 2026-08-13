'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Upload } from 'lucide-react';
import { useTheme } from '@/components/ui/ThemeProvider';
import ToolbarDock from './ToolbarDock';
import EditorHeader from './EditorHeader';
import LegacySidebarPanels from './LegacySidebarPanels';
import ContextualInspector from '@/components/editor/ContextualInspector';
import LayersPanel from '@/components/editor/LayersPanel';
import ExportDialog from '@/components/editor/ExportDialog';
import YouTubeDialog from '@/components/editor/YouTubeDialog';
import FeedPreviewDialog from '@/components/editor/FeedPreviewDialog';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSyncDraftTitle } from '@/hooks/useSyncDraftTitle';
import { useDragDropUpload } from '@/hooks/useDragDropUpload';
import { useEditorProjectSession } from '@/hooks/useEditorProjectSession';
import { useEditorAutosave } from '@/hooks/useEditorAutosave';
import { useEditorAssets } from '@/hooks/useEditorAssets';
import { useEditorSidebar, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '@/hooks/useEditorSidebar';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { editorReturnToUrl } from '@/lib/editor-runtime';

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(() => import('@/components/editor/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#f7f7f5]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#111111]"></div>
    </div>
  ),
});

/**
 * Editor workspace orchestrator (composition root of the editor UI).
 *
 * Wires the extracted editor hooks — session, autosave, assets, sidebar,
 * tabs — into a single render surface. All state and behavior live in the
 * hooks; this component only composes them and renders presentational UI.
 */
export default function EditorWorkspace() {
  const params = useParams();
  const projectId = params.id as string;
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  useKeyboard();

  // Destination of the in-editor Home / back pill: the launch URL carries
  // a relative `return_to` (stamped by the InstaEdit SPA, e.g.
  // `/app/covers?group=7`) so the user lands back on the exact Copertine
  // hub of the group they opened the editor from. Read in an effect so
  // server-rendered markup never differs from the client value.
  const [returnUrl, setReturnUrl] = useState<string>(editorReturnToUrl);
  useEffect(() => {
    setReturnUrl(editorReturnToUrl());
  }, []);

  const { sessionGate, loading, error, hydratedRef } = useEditorProjectSession(projectId);

  const canvasRef = useRef<any>(null);
  useEditorAutosave({ canvasRef, sessionGate, hydratedRef });

  const { openTabs, switchEditorTab, closeEditorTab } = useEditorTabs(projectId, returnUrl);
  const sidebar = useEditorSidebar();
  const assets = useEditorAssets(sidebar.sidebarTab);
  const dragDrop = useDragDropUpload();

  const { currentProject, updateProjectName } = useProjectStore();
  const { addToast, showExportDialog, showYouTubeDialog, showFeedPreviewDialog, setFeedPreviewDialog } = useUIStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  const generateRandomName = () => {
    const adjectives = ['Vibrant', 'Neon', 'Cosmic', 'Electric', 'Stealth', 'Hyper', 'Sonic', 'Golden', 'Pixel', 'Astro'];
    const nouns = ['Nebula', 'Blade', 'Vortex', 'Spark', 'Zenith', 'Echo', 'Pulse', 'Wave', 'Grid', 'Forge'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 99) + 1;
    return `${randomAdj}-${randomNoun}-${randomNumber}`;
  };

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

  // Sync the rename pill to the InstaEdit draft (partial PUT, title
  // only, debounced) so the Copertine hub card shows the operator's
  // real project name instead of the auto-generated draft title.
  useSyncDraftTitle(projectId, currentProject?.name ?? '');

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen is not available', error);
      addToast({ type: 'warning', message: 'Fullscreen non disponibile in questo browser' });
    }
  }, [addToast]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const handleObjectHover = useCallback((id: string | null) => {
    // Keep the contextual bar open after leaving the layer row: the user
    // needs time to move from the right sidebar down to the toolbar above
    // Text/Image/Shape/Crop and adjust the selected object there.
    if (id) setHoveredObjectId(id);
  }, []);

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDarkTheme ? 'bg-[#111318] text-white' : 'bg-[#f7f7f5] text-[#111111]'}`}>
        <div className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 ${isDarkTheme ? 'border-white' : 'border-[#111111]'}`}></div>
          <p className={isDarkTheme ? 'text-white/60' : 'text-[#6e6e73]'}>Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f7f5] text-[#111111]">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={() => window.location.assign(returnUrl)}
            className="text-[#111111] underline-offset-2 hover:underline"
          >
            Torna a Copertine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`editor-app relative flex h-screen flex-col overflow-hidden ${isDarkTheme ? 'bg-[#111318] text-white' : 'bg-[#f7f7f5] text-[#111111]'}`}
      onDragEnter={dragDrop.handleDragEnter}
      onDragOver={dragDrop.handleDragOver}
      onDragLeave={dragDrop.handleDragLeave}
      onDrop={dragDrop.handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {dragDrop.isDragging && (
        <div className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center border-4 border-dashed border-black/20 bg-white/70 p-12 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex scale-110 flex-col items-center gap-4 rounded-3xl border border-black/10 bg-white p-8 shadow-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-black/[0.05] text-[#111111] animate-bounce">
              <Upload className="w-10 h-10" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#111111]">Drop to Upload</h3>
              <p className="text-[#6e6e73]">Release your images to add them to the canvas</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative h-screen">
        {/* Main Canvas Area */}
        <main className={`editor-workspace relative flex-1 overflow-hidden p-12 flex items-center justify-center ${isDarkTheme ? 'bg-[#111318]' : 'bg-[#f7f7f5]'}`} style={{ marginRight: sidebar.sidebarWidth }}>
          {/* Floating Top-Left Navigation Pill */}
          <EditorHeader
            tabs={openTabs}
            activeTabId={projectId}
            projectName={currentProject?.name || ''}
            returnUrl={returnUrl}
            isDarkTheme={isDarkTheme}
            isFullscreen={isFullscreen}
            onSwitchTab={(id) => void switchEditorTab(id)}
            onCloseTab={(id) => void closeEditorTab(id)}
            onNameChange={handleProjectNameChange}
            onNameBlur={handleProjectNameBlur}
            onToggleFullscreen={() => void toggleFullscreen()}
          />

          {/* Canvas wrapper */}
          <div className={`editor-canvas relative z-10 aspect-video w-full max-w-4xl overflow-visible rounded-[3px] border shadow-[0_12px_36px_rgba(0,0,0,0.055)] ${isDarkTheme ? 'border-white/10 bg-white' : 'border-black/[0.10] bg-white'}`}>
            <Canvas canvasRef={canvasRef} />
          </div>

          {/* Bottom Dock - Tool floating bar */}
          <ContextualInspector hoveredObjectId={hoveredObjectId} dark={isDarkTheme} placement="toolbar" />
          <ToolbarDock />
        </main>

        {/* Hoverable Sidebar */}
        <aside
          onMouseEnter={sidebar.handleSidebarEnter}
          onMouseLeave={sidebar.handleSidebarLeave}
          className="sidebar-shell fixed bottom-0 right-0 top-0 z-30 flex translate-x-0 flex-col"
          style={{ width: sidebar.sidebarWidth } as React.CSSProperties}
        >
          {/* Trigger handle bar on the left edge of the sidebar */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 flex w-[28px] cursor-col-resize items-center justify-center border-r border-black/10 bg-black/5"
            role="separator"
            aria-label="Ridimensiona sidebar"
            aria-orientation="vertical"
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebar.sidebarWidth}
            tabIndex={0}
            onPointerDown={sidebar.handleSidebarResizeStart}
            onKeyDown={sidebar.handleSidebarResizeKeyDown}
            onDoubleClick={() => sidebar.updateSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
            title="Trascina per ridimensionare · doppio clic per ripristinare"
          >
            <div className="w-1 h-12 rounded-full bg-black/20"></div>
          </div>
          <div className={`editor-sidebar-surface pl-[28px] flex flex-col h-full border-l shadow-[-10px_0_28px_rgba(0,0,0,0.08),inset_1px_0_0_rgba(0,0,0,0.03)] ${isDarkTheme ? 'bg-[#17191f] text-white border-white/10' : 'bg-white text-[#171717] border-black/[0.10]'}`} onClick={sidebar.handleSidebarEnter}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden">
                <LayersPanel onLayerHover={handleObjectHover} />
              </div>
            </div>
            {/* Legacy sidebar tabs + panels (dormant, never rendered) */}
            <LegacySidebarPanels
              sidebarTab={sidebar.sidebarTab}
              setSidebarTab={sidebar.setSidebarTab}
              assets={assets}
            />
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      {showExportDialog && <ExportDialog canvasRef={canvasRef} />}
      {showYouTubeDialog && <YouTubeDialog />}
      <FeedPreviewDialog
        isOpen={showFeedPreviewDialog}
        onClose={() => setFeedPreviewDialog(false)}
        canvasRef={canvasRef}
      />

    </div>
  );
}
