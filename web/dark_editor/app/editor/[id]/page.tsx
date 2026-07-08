'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Home,
  Type,
  Image as ImageIcon,
  Wand2,
  Maximize,
  Undo,
  Redo,
  Grid3x3,
  Magnet,
  ZoomIn,
  Upload,
  Eye,
  Share2,
} from 'lucide-react';
import ToolbarDock from './components/ToolbarDock';
import LayersPanel from '@/components/editor/LayersPanel';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import ExportDialog from '@/components/editor/ExportDialog';
import AIDialog from '@/components/editor/AIDialog';
import YouTubeDialog from '@/components/editor/YouTubeDialog';
import FeedPreviewDialog from '@/components/editor/FeedPreviewDialog';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore'; // Added missing import
import { useKeyboard } from '@/hooks/useKeyboard';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { getProject, uploadImage } from '@/lib/api';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { onEditorSaveRequest } from '@/lib/editorEvents';
import { v4 as uuidv4 } from 'uuid';

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(() => import('@/components/editor/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#eaedf0] dark:bg-[#0a0f14]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { loadObjects, addObject } = useEditorStore();
  const { setCurrentProject, setDirty, currentProject, isDirty, isSaving, saveProject, updateProjectName } = useProjectStore();
  const { addToast, showExportDialog, showAIDialog, showYouTubeDialog, showFeedPreviewDialog, setFeedPreviewDialog } = useUIStore();
  const { objects, canvasWidth, canvasHeight, selectedIds } = useEditorStore();
  const canvasRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasHydratedRef = useRef(false);
  const ignoreNextObjectsRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastPreviewAtRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize keyboard shortcuts
  useKeyboard();

  // Auto-open sidebar when object selected, auto-close after 4s idle
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSidebarPinned(true);
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
      sidebarTimerRef.current = setTimeout(() => setSidebarPinned(false), 4000);
    } else {
      setSidebarPinned(false);
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    }
    return () => {
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    };
  }, [selectedIds]);

  const handleSidebarEnter = () => {
    if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
  };

  const handleSidebarLeave = () => {
    if (selectedIds.length > 0) {
      sidebarTimerRef.current = setTimeout(() => setSidebarPinned(false), 4000);
    } else {
      setSidebarPinned(false);
    }
  };
  
  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getProject(projectId);
      
      // Set current project
      setCurrentProject({
        id: data.id,
        name: data.name,
        type: 'project',
        canvas_json: data.canvas_json,
        preview_url: data.preview_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
      
      // Load objects from canvas_json
      if (data.canvas_json && Array.isArray((data.canvas_json as { objects?: unknown[] }).objects)) {
        ignoreNextObjectsRef.current = true;
        loadObjects((data.canvas_json as { objects: unknown[] }).objects as Parameters<typeof loadObjects>[0]);
      }
      
      setDirty(false);
      hasHydratedRef.current = true;
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project');
      addToast({
        type: 'error',
        message: 'Failed to load project',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, loadObjects, projectId, setCurrentProject, setDirty]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (ignoreNextObjectsRef.current) {
      ignoreNextObjectsRef.current = false;
      return;
    }
    setDirty(true);
  }, [objects, setDirty]);

  const performSave = useCallback(async (opts?: { forcePreview?: boolean }) => {
    if (!hasHydratedRef.current) return;
    if (!currentProject) return;
    if (isSaving) return;

    let previewFilename: string | undefined;
    const now = Date.now();
    const shouldUpdatePreview = !!opts?.forcePreview || now - lastPreviewAtRef.current > 3000;
    if (shouldUpdatePreview) {
      try {
        const previewFile = await captureEditorCanvasPreviewFile();
        if (previewFile) {
          const uploaded = await uploadImage(previewFile);
          previewFilename = uploaded.filename;
          lastPreviewAtRef.current = now;
        }
      } catch (err) {
        console.warn('Preview capture/upload failed', err);
      }
    }

    await saveProject({ objects, canvasWidth, canvasHeight }, previewFilename);
  }, [canvasHeight, canvasWidth, currentProject, isSaving, objects, saveProject]);

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

  // Auto-save logic
  useEffect(() => {
    if (!currentProject || !objects.length || !isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      console.log('Auto-saving...');
      
      let previewFilename = '';
      
      // Try to generate preview
      try {
        const stage = canvasRef.current?.getStage();
        if (stage) {
          const dataURL = stage.toDataURL({
            pixelRatio: 0.5, // Lower quality for preview
            mimeType: 'image/jpeg',
            quality: 0.7,
          });
          
          // Convert dataURL to Blob/File and upload
          const res = await fetch(dataURL);
          const blob = await res.blob();
          const file = new File([blob], `preview_${currentProject.id}.jpg`, { type: 'image/jpeg' });
          
          const { uploadImage } = await import('@/lib/api');
          const uploadResult = await uploadImage(file);
          previewFilename = uploadResult.filename;
        }
      } catch (e) {
        console.error('Failed to generate preview:', e);
      }

      await saveProject({ objects, canvasWidth, canvasHeight }, previewFilename);
      setDirty(false);
    }, 3000); // 3 seconds debounce

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [objects, currentProject, isDirty, saveProject, setDirty, canvasWidth, canvasHeight]);

  useEffect(() => {
    return onEditorSaveRequest(() => {
      void performSave({ forcePreview: true });
    });
  }, [performSave]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (!currentProject) return;
    if (!isDirty) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void performSave();
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [currentProject, isDirty, objects, performSave]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we are actually leaving the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    const { setUploading } = useUIStore.getState();
    setUploading(true);

    try {
      for (const file of imageFiles) {
        const result = await uploadImage(file);
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.src = result.url.startsWith('http') || result.url.startsWith('data:') ? result.url : `/dark_editor_v2/${result.url}`;
          img.onload = () => {
            let w = img.naturalWidth || img.width || 400;
            let h = img.naturalHeight || img.height || 300;
            const max = 400;
            if (w > max || h > max) {
              if (w > h) {
                h = Math.round((h / w) * max);
                w = max;
              } else {
                w = Math.round((w / h) * max);
                h = max;
              }
            }
            addObject({
              id: uuidv4(),
              type: 'image',
              name: file.name,
              x: 100 + (Math.random() * 50),
              y: 100 + (Math.random() * 50),
              width: w,
              height: h,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              src: result.url,
            });
            resolve();
          };
          img.onerror = () => {
            addObject({
              id: uuidv4(),
              type: 'image',
              name: file.name,
              x: 100 + (Math.random() * 50),
              y: 100 + (Math.random() * 50),
              width: 400,
              height: 300,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              src: result.url,
            });
            resolve();
          };
        });
      }
      addToast({ type: 'success', message: `Added ${imageFiles.length} image(s)` });
    } catch (error) {
      console.error('Drop upload failed:', error);
      addToast({ type: 'error', message: 'Failed to upload one or more images' });
    } finally {
      setUploading(false);
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
          <button
            onClick={() => router.push('/')}
            className="text-primary hover:underline"
          >
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
      {/* Drag & Drop Overlay */}
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

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative h-screen">
        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-12 mr-[30px]">
          {/* Floating Top-Left Navigation Pill */}
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

          {/* Blurred Background Gradient Blobs */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

          {/* Canvas wrapper */}
          <div className="relative aspect-video w-full max-w-4xl bg-white dark:bg-slate-900 canvas-shadow rounded-sm overflow-hidden border border-slate-200 dark:border-slate-800 z-10">
            <Canvas canvasRef={canvasRef} />
          </div>
          
          {/* Bottom Dock - Tool floating bar */}
          <ToolbarDock />
        </main>
        
        {/* Hoverable Sidebar */}
        <aside
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          className={`sidebar-shell fixed right-0 top-0 bottom-0 w-[400px] transition-transform duration-300 ease-out flex flex-col z-30 ${
            sidebarPinned ? 'translate-x-0' : 'translate-x-[370px] hover:translate-x-0'
          }`}
        >
          {/* Trigger handle bar on the left edge of the sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-[30px] flex items-center justify-center bg-white/[0.03] border-r border-white/[0.06] cursor-pointer">
            <div className="w-1.5 h-16 rounded-full bg-sky-400/55 opacity-70 shadow-[0_0_18px_rgba(56,189,248,0.2)]"></div>
          </div>
          <div className="pl-[30px] flex flex-col h-full bg-slate-900 border-l border-slate-800" onClick={handleSidebarEnter}>
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-850 bg-slate-950 text-xs font-semibold select-none">
              <div className="flex-1 py-3 text-center border-b-2 border-primary text-primary bg-slate-900/50">
                Design
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              <div className="flex-1 flex flex-col min-h-0">
                <PropertiesPanel />
                <div className="border-t border-slate-800 flex-1 overflow-hidden flex flex-col min-h-0">
                  <LayersPanel />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      
      {/* Dialogs */}
      {showExportDialog && <ExportDialog />}
      {showAIDialog && <AIDialog />}
      {showYouTubeDialog && <YouTubeDialog />}
      <FeedPreviewDialog isOpen={showFeedPreviewDialog} onClose={() => setFeedPreviewDialog(false)} />

    </div>
  );
}
