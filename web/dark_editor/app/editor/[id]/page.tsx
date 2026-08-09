'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Home,
  Film,
  Type,
  Image as ImageIcon,
  Crop,
  Square,
  Circle,
  Maximize,
  Undo,
  Redo,
  Grid3x3,
  Magnet,
  ZoomIn,
  Save,
  ChevronRight,
  Layout,
  Upload, // Added Upload icon
  Eye,
  FolderHeart,
  Library,
  Trash2,
  Share2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import Toolbar from '@/components/editor/Toolbar';
import ToolbarDock from './components/ToolbarDock';
import LayersPanel from '@/components/editor/LayersPanel';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import PresetPanel from '@/components/editor/PresetPanel';
import FilterPanel from '@/components/editor/FilterPanel';
import ExportDialog from '@/components/editor/ExportDialog';
import YouTubeDialog from '@/components/editor/YouTubeDialog';
import FeedPreviewDialog from '@/components/editor/FeedPreviewDialog';
import FeatureTest from '@/components/editor/FeatureTest';
import VersioningPanel from '@/components/editor/VersioningPanel';
import AdvancedTemplatePanel from '@/components/editor/AdvancedTemplatePanel';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore'; // Added missing import
import { useKeyboard } from '@/hooks/useKeyboard';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useYouTubeSessionGate } from '@/hooks/useYouTubeSessionGate';
import { useSyncDraftTitle } from '@/hooks/useSyncDraftTitle';
import { getProject } from '@/lib/api';
import { resolveEditorAssetUrl, uploadImage } from '@/lib/api';
import { editorProjectContextPath, editorReturnToUrl } from '@/lib/editor-runtime';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { onEditorFlushRequest, onEditorSaveRequest } from '@/lib/editorEvents';
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
  const projectId = params.id as string;
  const sessionGate = useYouTubeSessionGate(projectId);

  // Destination of the in-editor Home / back pill: the launch URL carries
  // a relative `return_to` (stamped by the InstaEdit SPA, e.g.
  // `/app/covers?group=7`) so the user lands back on the exact Copertine
  // hub of the group they opened the editor from. Read in an effect so
  // server-rendered markup never differs from the client value.
  const [returnUrl, setReturnUrl] = useState<string>(editorReturnToUrl);
  useEffect(() => {
    setReturnUrl(editorReturnToUrl());
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { loadObjects, setCanvasSize, addObject } = useEditorStore();
  const { setCurrentProject, setDirty, currentProject, isDirty, isSaving, saveProject, updateProjectName } = useProjectStore();
  const { addToast, showExportDialog, showYouTubeDialog, showFeedPreviewDialog, setFeedPreviewDialog, showRightSidebar, toggleRightSidebar } = useUIStore();
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

  const [sidebarTab, setSidebarTab] = useState<'design' | 'assets'>('design');
  const [customAssets, setCustomAssets] = useState<Array<{id: string, name: string, src: string}>>([]);
  const customAssetInputRef = useRef<HTMLInputElement>(null);

  // Initialize keyboard shortcuts
  useKeyboard();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dark_editor_custom_assets');
      if (stored) {
        setCustomAssets(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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

      // Refresh the source for older sessions that persisted a dead CDN URL.
      // This keeps the editor image identical to the channel-card thumbnail.
      let sessionSourceThumbnail = '';
      if (projectId.startsWith('ve_')) {
        try {
          const sessionResponse = await fetch(editorProjectContextPath(projectId), { cache: 'no-store' });
          if (sessionResponse.ok) {
            const session = await sessionResponse.json() as { source_thumbnail_url?: string };
            sessionSourceThumbnail = String(session.source_thumbnail_url || '').trim();
          }
        } catch {
          // The persisted project remains usable if the session lookup fails.
        }
      }

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

      // YouTube thumbnails use one canonical document size everywhere.
      // Older sessions were authored at 1280x720, so migrate their logical
      // coordinates once into the 1920x1080 document instead of rendering a
      // small image in the top-left corner.
      const canvas = (data.canvas_json || {}) as {
        objects?: unknown[];
        width?: number;
        height?: number;
        canvasWidth?: number;
        canvasHeight?: number;
      };
      const sourceObjects = Array.isArray(canvas.objects) ? canvas.objects : [];
      // Editor sessions created by InstaEdit use the `ve_*` id and may have
      // an arbitrary E2E/draft title (for example `InstaEdit E2E ...`). Do
      // not use the display title as the document-type discriminator: those
      // sessions still need the canonical 1920x1080 migration.
      const isYouTubeThumbnail = projectId.startsWith('ve_')
        || data.type === 'youtube_thumbnail'
        || /^YouTube thumbnail\b/i.test(data.name)
        || sourceObjects.some((value) => {
          const object = value as { type?: string; name?: string };
          return object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail');
        });
      const storedWidth = Number(canvas.canvasWidth ?? canvas.width);
      const storedHeight = Number(canvas.canvasHeight ?? canvas.height);
      const normalizedWidth = isYouTubeThumbnail ? 1920 : storedWidth;
      const normalizedHeight = isYouTubeThumbnail ? 1080 : storedHeight;
      if (Number.isFinite(normalizedWidth) && normalizedWidth > 0 && Number.isFinite(normalizedHeight) && normalizedHeight > 0) {
        setCanvasSize(normalizedWidth, normalizedHeight);
      }

      const legacyThumbnail = isYouTubeThumbnail && (
        (storedWidth === 1280 && storedHeight === 720)
        || sourceObjects.some((value) => {
          const object = value as { type?: string; name?: string; width?: number; height?: number };
          return object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail') && object.width === 1280 && object.height === 720;
        })
      );
      const scaleLegacyObject = (value: unknown) => {
        const object = value as Record<string, unknown>;
        const isSourceThumbnail = object.type === 'image'
          && String(object.name || '').toLowerCase().includes('source thumbnail');
        // The source thumbnail is the document background. Older saved
        // sessions can contain a bad pan (for example x=-62/y=-411) even
        // though their document is already 1920x1080; that pan is exactly
        // what produces the visible blank band below the image.
        if (!legacyThumbnail && !(isYouTubeThumbnail && isSourceThumbnail)) return value;
        const scale = (key: string) => typeof object[key] === 'number' ? (object[key] as number) * 1.5 : object[key];
        const scaleNested = (key: string, keys: string[]) => {
          const nested = object[key];
          if (!nested || typeof nested !== 'object') return nested;
          return Object.fromEntries(Object.entries(nested as Record<string, unknown>).map(([name, nestedValue]) => [name, keys.includes(name) && typeof nestedValue === 'number' ? nestedValue * 1.5 : nestedValue]));
        };
        const next: Record<string, unknown> = {
          ...object,
          x: scale('x'), y: scale('y'), width: scale('width'), height: scale('height'),
          fontSize: scale('fontSize'), padding: scale('padding'), letterSpacing: scale('letterSpacing'), strokeWidth: scale('strokeWidth'),
          textShadow: scaleNested('textShadow', ['offsetX', 'offsetY', 'blur']),
          textStroke: scaleNested('textStroke', ['width']),
          dropShadow: scaleNested('dropShadow', ['offsetX', 'offsetY', 'blur', 'spread']),
        };
        if (isYouTubeThumbnail && isSourceThumbnail) {
          next.x = 0; next.y = 0; next.width = 1920; next.height = 1080; next.scaleX = 1; next.scaleY = 1;
          if (sessionSourceThumbnail) next.src = sessionSourceThumbnail;
        }
        return next;
      };
      const objects = sourceObjects.map(scaleLegacyObject);

      if (objects.length > 0) {
        ignoreNextObjectsRef.current = true;
        loadObjects(objects as Parameters<typeof loadObjects>[0]);
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
  }, [addToast, loadObjects, projectId, setCanvasSize, setCurrentProject, setDirty]);

  useEffect(() => {
    if (sessionGate.state === 'editable_editing' || sessionGate.state === 'editable_failed' || sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published') {
      loadProject();
    } else if (sessionGate.state === 'not_found' || sessionGate.state === 'unauthorized') {
      setLoading(false);
      setError(sessionGate.state === 'unauthorized' ? 'Authentication required' : 'Editor project context not available');
    } else if (sessionGate.state === 'error') {
      setLoading(false);
      setError(sessionGate.message);
    }
  }, [loadProject, sessionGate.state]);

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
    if (sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published') return;
    if (sessionGate.state !== 'editable_editing' && sessionGate.state !== 'editable_failed') return;
    const latestEditorState = useEditorStore.getState();
    const latestObjects = latestEditorState.objects;
    const latestCanvasWidth = latestEditorState.canvasWidth;
    const latestCanvasHeight = latestEditorState.canvasHeight;

    let previewFilename: string | undefined;
    const now = Date.now();
    const shouldUpdatePreview = !!opts?.forcePreview || now - lastPreviewAtRef.current > 3000;
    if (shouldUpdatePreview) {
      try {
        const previewFile = await captureEditorCanvasPreviewFile(
          canvasRef.current?.getStage?.(),
          latestCanvasWidth,
          latestCanvasHeight,
        );
        if (previewFile) {
          const uploaded = await uploadImage(previewFile);
          previewFilename = uploaded.filename;
          lastPreviewAtRef.current = now;
        }
      } catch (err) {
        console.warn('Preview capture/upload failed', err);
      }
    }

    await saveProject({ objects: latestObjects, canvasWidth: latestCanvasWidth, canvasHeight: latestCanvasHeight }, previewFilename);
  }, [currentProject, saveProject, sessionGate.state]);

  useEffect(() => {
    return onEditorFlushRequest(async () => {
      // Export must not race the debounced autosave. This also refreshes the
      // persisted preview from the same live Konva stage that Export reads.
      await performSave({ forcePreview: true });
    });
  }, [performSave]);

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
  // real project name instead of the auto-generated draft title. The
  // pill rename alone only persists to the editor's local
  // data/projects.json; the hub card renders draft_title from the
  // InstaEdit DB.
  useSyncDraftTitle(projectId, currentProject?.name ?? '');

  useEffect(() => {
    return onEditorSaveRequest(() => {
      void performSave({ forcePreview: true });
    });
  }, [performSave]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (!currentProject) return;
    if (!isDirty) return;
    if (sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published') return;
    if (sessionGate.state !== 'editable_editing' && sessionGate.state !== 'editable_failed') return;

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
  }, [currentProject, isDirty, objects, performSave, sessionGate.state]);

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
          const assetUrl = resolveEditorAssetUrl(result.url);
          img.src = assetUrl;
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
              src: assetUrl,
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
              src: assetUrl,
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
      <div className="h-screen flex items-center justify-center bg-[#f7f7f5] text-[#111111]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading project...</p>
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
            className="text-primary hover:underline"
          >
            Torna a Copertine
          </button>
        </div>
      </div>
    );
  }
  return (
    <div
      className="editor-app relative flex h-screen flex-col overflow-hidden bg-[#f7f7f5] text-[#111111]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
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
        <main className="editor-workspace relative mr-[30px] flex-1 overflow-hidden bg-[#f7f7f5] p-12 flex items-center justify-center">
          {/* Floating Top-Left Navigation Pill */}
          <div className="editor-header absolute left-6 top-6 z-30 flex items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white/[0.96] px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            {/* Back to the InstaEdit Copertine hub of the group the user
                opened the editor from (relative return_to stamped by the
                SPA launch URL; falls back to the hub without a group). */}
            <a
              href={returnUrl}
              className="text-black/60 transition-colors hover:text-black"
              title="Torna a Copertine"
            >
              <Home className="w-4 h-4" />
            </a>
            <span className="select-none text-xs text-black/30">/</span>
            <div className="relative group max-w-[180px]">
              <input
                type="text"
                value={currentProject?.name || ''}
                onChange={handleProjectNameChange}
                onBlur={handleProjectNameBlur}
                placeholder="Senza nome"
                className="w-full truncate rounded border-none bg-transparent px-1.5 py-0.5 text-xs font-semibold text-[#111111] placeholder:italic transition-all duration-200 focus:bg-black/[0.03] focus:outline-none focus:ring-1 focus:ring-black/10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </div>
          </div>

          {/* Canvas wrapper */}
          <div className="editor-canvas relative z-10 aspect-video w-full max-w-4xl overflow-hidden rounded-[3px] border border-black/[0.10] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.055)]">
            <Canvas canvasRef={canvasRef} />
          </div>

          {/* Bottom Dock - Tool floating bar */}
          <ToolbarDock />
        </main>

        {/* Hoverable Sidebar */}
        <aside
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          className={`sidebar-shell fixed right-0 top-0 bottom-0 w-[360px] transition-transform duration-300 ease-out flex flex-col z-30 ${
            sidebarPinned ? 'translate-x-0' : 'translate-x-[332px] hover:translate-x-0'
          }`}
        >
          {/* Trigger handle bar on the left edge of the sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-[28px] flex items-center justify-center bg-black/5 border-r border-black/10 cursor-pointer">
            <div className="w-1 h-12 rounded-full bg-black/20"></div>
          </div>
          <div className="pl-[28px] flex flex-col h-full bg-[#f7f7f5] text-[#171717] border-l border-black/10 shadow-[-18px_0_50px_rgba(0,0,0,0.12)]" onClick={handleSidebarEnter}>
            {/* Sidebar Tabs */}
            <div className="flex gap-1 border-b border-black/10 bg-white/70 px-2 py-2 text-[11px] font-semibold select-none">
              <button
                onClick={() => setSidebarTab('design')}
                className={`flex-1 rounded-lg py-2 text-center transition-all ${
                  sidebarTab === 'design' ? 'bg-black text-white shadow-sm' : 'text-black/45 hover:bg-black/5 hover:text-black'
                }`}
              >
                Design
              </button>
              <button
                onClick={() => setSidebarTab('assets')}
                className={`flex-1 rounded-lg py-2 text-center transition-all ${
                  sidebarTab === 'assets' ? 'bg-black text-white shadow-sm' : 'text-black/45 hover:bg-black/5 hover:text-black'
                }`}
              >
                Asset
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              {sidebarTab === 'design' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <PropertiesPanel />
                  <div className="border-t border-slate-800 flex-1 overflow-hidden flex flex-col min-h-0">
                    <LayersPanel />
                  </div>
                </div>
              )}

              {sidebarTab === 'assets' && (
                <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asset di Brand Precaricati</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'news-badge',
                          name: 'Breaking News',
                          src: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=150&q=80',
                          action: () => {
                            addObject({
                              id: uuidv4(),
                              type: 'rect',
                              name: 'Breaking News Red Bar',
                              x: 50,
                              y: 300,
                              width: 700,
                              height: 80,
                              fill: '#e11d48',
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 0.9,
                              visible: true,
                              locked: false,
                            });
                            addObject({
                              id: uuidv4(),
                              type: 'text',
                              name: 'Breaking News Text',
                              x: 70,
                              y: 315,
                              width: 300,
                              height: 50,
                              text: 'BREAKING NEWS',
                              fontSize: 36,
                              fontFamily: 'Impact',
                              fill: '#ffffff',
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 1,
                              visible: true,
                              locked: false,
                            });
                            addToast({ type: 'success', message: 'Elemento Breaking News aggiunto!' });
                          }
                        },
                        {
                          id: 'live-badge',
                          name: 'LIVE Indicator',
                          src: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=150&q=80',
                          action: () => {
                            addObject({
                              id: uuidv4(),
                              type: 'rect',
                              name: 'LIVE Red Badge',
                              x: 50,
                              y: 50,
                              width: 120,
                              height: 50,
                              fill: '#dc2626',
                              borderRadius: 8,
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 1,
                              visible: true,
                              locked: false,
                            });
                            addObject({
                              id: uuidv4(),
                              type: 'text',
                              name: 'LIVE Text',
                              x: 75,
                              y: 60,
                              width: 100,
                              height: 30,
                              text: 'LIVE',
                              fontSize: 22,
                              fontFamily: 'Arial',
                              fill: '#ffffff',
                              fontWeight: 'bold',
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 1,
                              visible: true,
                              locked: false,
                            });
                            addToast({ type: 'success', message: 'Elemento LIVE aggiunto!' });
                          }
                        },
                        {
                          id: 'yellow-border',
                          name: 'Yellow Frame',
                          src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
                          action: () => {
                            addObject({
                              id: uuidv4(),
                              type: 'rect',
                              name: 'Yellow Border Outline',
                              x: 0,
                              y: 0,
                              width: 800,
                              height: 450,
                              fill: 'transparent',
                              stroke: '#facc15',
                              strokeWidth: 20,
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 1,
                              visible: true,
                              locked: false,
                            });
                            addToast({ type: 'success', message: 'Cornice Gialla aggiunta!' });
                          }
                        },
                        {
                          id: 'speech-bubble',
                          name: 'Speech Bubble',
                          src: 'https://images.unsplash.com/photo-1533750349088-cd871a723597?auto=format&fit=crop&w=150&q=80',
                          action: () => {
                            addObject({
                              id: uuidv4(),
                              type: 'rect',
                              name: 'Speech Bubble Base',
                              x: 450,
                              y: 80,
                              width: 280,
                              height: 120,
                              fill: '#ffffff',
                              borderRadius: 20,
                              stroke: '#000000',
                              strokeWidth: 4,
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 1,
                              visible: true,
                              locked: false,
                            });
                            addObject({
                              id: uuidv4(),
                              type: 'text',
                              name: 'Speech Bubble Text',
                              x: 470,
                              y: 115,
                              width: 200,
                              height: 40,
                              text: 'MA DAVVERO?!',
                              fontSize: 24,
                              fontFamily: 'Impact',
                              fill: '#000000',
                              rotation: 0,
                              scaleX: 1,
                              scaleY: 1,
                              opacity: 1,
                              visible: true,
                              locked: false,
                            });
                            addToast({ type: 'success', message: 'Fumetto aggiunto!' });
                          }
                        }
                      ].map((asset) => (
                        <button
                          key={asset.id}
                          onClick={asset.action}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800 hover:border-primary hover:bg-primary/5 transition-all text-left bg-slate-950/20"
                        >
                          <img
                            src={asset.src}
                            alt={asset.name}
                            className="w-full h-16 object-cover rounded-md"
                          />
                          <span className="text-[10px] font-semibold text-slate-300 truncate w-full text-center">{asset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carica Asset Locale</h4>
                    <input
                      ref={customAssetInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const { setUploading } = useUIStore.getState();
                        try {
                          setUploading(true);
                          const res = await uploadImage(file);
                          const newAsset = {
                            id: uuidv4(),
                            name: file.name.split('.')[0],
                            src: resolveEditorAssetUrl(res.url),
                          };
                          const updated = [newAsset, ...customAssets];
                          setCustomAssets(updated);
                          localStorage.setItem('dark_editor_custom_assets', JSON.stringify(updated));
                          addToast({ type: 'success', message: 'Asset caricato con successo!' });
                        } catch (err) {
                          addToast({ type: 'error', message: 'Errore durante il caricamento' });
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full text-xs h-9 flex items-center justify-center gap-1.5"
                      onClick={() => customAssetInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Carica Nuova Immagine
                    </Button>
                  </div>

                  {customAssets.length > 0 && (
                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asset Condivisi ({customAssets.length})</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {customAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="relative group flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800 bg-slate-950/20"
                          >
                            <button
                              onClick={() => {
                                addObject({
                                  id: uuidv4(),
                                  type: 'image',
                                  name: asset.name,
                                  x: 100,
                                  y: 100,
                                  width: 250,
                                  height: 180,
                                  rotation: 0,
                                  scaleX: 1,
                                  scaleY: 1,
                                  opacity: 1,
                                  visible: true,
                                  locked: false,
                                  src: asset.src,
                                });
                                addToast({ type: 'success', message: `Immagine ${asset.name} aggiunta!` });
                              }}
                              className="w-full flex flex-col items-center gap-1"
                            >
                              <img
                                src={asset.src}
                                alt={asset.name}
                                className="w-full h-16 object-cover rounded-md"
                              />
                              <span className="text-[10px] font-semibold text-slate-300 truncate w-full text-center">{asset.name}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = customAssets.filter(a => a.id !== asset.id);
                                setCustomAssets(updated);
                                localStorage.setItem('dark_editor_custom_assets', JSON.stringify(updated));
                                addToast({ type: 'info', message: 'Asset rimosso' });
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Rimuovi"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
