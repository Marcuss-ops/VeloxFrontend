'use client';

import React, { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTheme } from '@/components/ui/ThemeProvider';
import ToolbarDock from './ToolbarDock';
import EditorHeader from './EditorHeader';
import EditorSidebar from './workspace/EditorSidebar';
import DragDropOverlay from './workspace/DragDropOverlay';
import { EditorErrorState, EditorLoadingState } from './workspace/EditorStates';
import ContextualInspector from '@/components/editor/ContextualInspector';
import ExportDialog from '@/components/editor/ExportDialog';
import FeedPreviewDialog from '@/components/editor/FeedPreviewDialog';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useDragDropUpload } from '@/hooks/useDragDropUpload';
import { useEditorProjectSession } from '@/hooks/useEditorProjectSession';
import { useEditorAutosave } from '@/hooks/useEditorAutosave';
import { useEditorFullscreen } from '@/hooks/useEditorFullscreen';
import { useEditorHover } from '@/hooks/useEditorHover';
import { useEditorReturnUrl } from '@/hooks/useEditorReturnUrl';
import { useProjectName } from '@/hooks/useProjectName';
import { useEditorSidebar } from '@/hooks/useEditorSidebar';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { clearEditorSession } from '@/lib/editor-session';
import type { CanvasHandle } from '@/lib/canvasHandle';

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
 * Wires the extracted editor hooks — session, autosave, sidebar, tabs,
 * fullscreen, hover, project name, return URL — into a single render
 * surface. All state and behavior live in the hooks; this component only
 * composes them and renders presentational UI (header, canvas, dock,
 * sidebar, overlays, dialogs).
 */
export default function EditorWorkspace() {
  const params = useParams();
  const projectId = params.id as string;
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  useKeyboard();

  const { returnUrl } = useEditorReturnUrl();
  const { sessionGate, loading, error, hydratedRef } = useEditorProjectSession(projectId);
  const { isFullscreen, toggleFullscreen } = useEditorFullscreen();
  const { hoveredObjectId, handleObjectHover } = useEditorHover();
  const { projectName, handleProjectNameChange, handleProjectNameBlur } = useProjectName(projectId);

  // Session lost (401 that re-minting could not heal — a stale editor URL
  // or an expired launch token): wipe the stale bearer and hand the user
  // back to the Copertine hub, the same "session lost → back to where you
  // came from" behaviour as the InstaEdit SPA. Re-opening the cover from
  // the hub mints a fresh launch token, so this is never a dead end.
  useEffect(() => {
    if (sessionGate.state !== 'unauthorized') return;
    clearEditorSession(projectId);
    window.location.assign(returnUrl);
  }, [projectId, returnUrl, sessionGate.state]);

  const canvasRef = useRef<CanvasHandle>(null);
  useEditorAutosave({ canvasRef, sessionGate, hydratedRef });

  const { openTabs, switchEditorTab, closeEditorTab } = useEditorTabs(projectId, returnUrl);
  const sidebar = useEditorSidebar();
  const dragDrop = useDragDropUpload();

  const { showExportDialog, showFeedPreviewDialog, setFeedPreviewDialog } = useUIStore();

  if (loading) return <EditorLoadingState isDarkTheme={isDarkTheme} />;

  if (error) {
    return <EditorErrorState error={error} onBack={() => window.location.assign(returnUrl)} />;
  }

  return (
    <div
      className={`editor-app relative flex h-screen flex-col overflow-hidden ${isDarkTheme ? 'bg-[#111318] text-white' : 'bg-[#f7f7f5] text-[#111111]'}`}
      onDragEnter={dragDrop.handleDragEnter}
      onDragOver={dragDrop.handleDragOver}
      onDragLeave={dragDrop.handleDragLeave}
      onDrop={dragDrop.handleDrop}
    >
      <DragDropOverlay isDragging={dragDrop.isDragging} />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative h-screen">
        {/* Main Canvas Area */}
        <main className={`editor-workspace relative flex-1 overflow-hidden p-6 sm:p-10 flex items-center justify-center ${isDarkTheme ? 'bg-[#111318]' : 'bg-[#f7f7f5]'}`} style={{ marginRight: sidebar.isSidebarVisible ? sidebar.sidebarWidth : 0 }}>
          {/* Floating Top-Left Navigation Pill */}
          <EditorHeader
            tabs={openTabs}
            activeTabId={projectId}
            projectName={projectName}
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

        <EditorSidebar sidebar={sidebar} isDarkTheme={isDarkTheme} onLayerHover={handleObjectHover} />

      </div>

      {/* Dialogs */}
      {showExportDialog && <ExportDialog canvasRef={canvasRef} />}
      <FeedPreviewDialog
        isOpen={showFeedPreviewDialog}
        onClose={() => setFeedPreviewDialog(false)}
        canvasRef={canvasRef}
      />

    </div>
  );
}
