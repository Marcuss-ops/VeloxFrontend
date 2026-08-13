'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Home,
  Film,
  Type,
  Image as ImageIcon,
  Crop,
  Square,
  Circle,
  Maximize2,
  Minimize2,
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
  X,
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
import { ThemeToggle, useTheme } from '@/components/ui/ThemeProvider';
import ToolbarDock from './components/ToolbarDock';
import ContextualInspector from '@/components/editor/ContextualInspector';
import LayersPanel from '@/components/editor/LayersPanel';
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
import { driveAssetContentUrl, listDriveAssets, resolveEditorAssetUrl, uploadImage } from '@/lib/api';
import type { DriveAsset } from '@/lib/api';
import { editorProjectContextPath, editorReturnToPath, editorReturnToUrl, editorRuntimePath } from '@/lib/editor-runtime';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { onEditorFlushRequest, onEditorSaveRequest, requestEditorFlush } from '@/lib/editorEvents';
import { useEditorTabsStore } from '@/stores/editorTabsStore';
import { v4 as uuidv4 } from 'uuid';

const SIDEBAR_WIDTH_KEY = 'instaeditor.editor-sidebar.width';
const SIDEBAR_DEFAULT_WIDTH = 400;
const SIDEBAR_MIN_WIDTH = 300;
const SIDEBAR_MAX_WIDTH = 560;
const DEFAULT_DRIVE_ASSET_FOLDER = '1Ui83Bp9du7EFkROX6qdq3S0G-_sT5MmP';

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(() => import('@/components/editor/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#f7f7f5]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#111111]"></div>
    </div>
  ),
});

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
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
  const { setCurrentProject, setDirty, currentProject, isDirty, saveProject, updateProjectName } = useProjectStore();
  const { addToast, showExportDialog, showYouTubeDialog, showFeedPreviewDialog, setFeedPreviewDialog, showRightSidebar, toggleRightSidebar } = useUIStore();
  const { tabs: openTabs, hydrate: hydrateTabs, openTab, closeTab, renameTab } = useEditorTabsStore();
  const { objects, canvasWidth, canvasHeight, selectedIds } = useEditorStore();
  const canvasRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasHydratedRef = useRef(false);
  const ignoreNextObjectsRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastPreviewAtRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const sidebarTimerRef = useRef<number | null>(null);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const clearSidebarHideTimer = useCallback(() => {
    if (sidebarTimerRef.current) {
      window.clearTimeout(sidebarTimerRef.current);
      sidebarTimerRef.current = null;
    }
  }, []);

  const scheduleSidebarAutoHide = useCallback(() => {
    clearSidebarHideTimer();
    sidebarTimerRef.current = window.setTimeout(() => {
      setSidebarPinned(false);
      sidebarTimerRef.current = null;
    }, 5000);
  }, [clearSidebarHideTimer]);

  const [sidebarTab, setSidebarTab] = useState<'design' | 'assets'>('design');
  // Properties and Assets now live in the contextual inspector above the
  // selected canvas object. Keep the legacy markup dormant for a safe,
  // incremental migration while Layers remains the only sidebar surface.
  const showLegacySidebarPanels = false;
  const [customAssets, setCustomAssets] = useState<Array<{id: string, name: string, src: string}>>([]);
  const [driveAssetFolder, setDriveAssetFolder] = useState(DEFAULT_DRIVE_ASSET_FOLDER);
  const [driveAssets, setDriveAssets] = useState<DriveAsset[]>([]);
  const [driveAssetsLoading, setDriveAssetsLoading] = useState(false);
  const [driveAssetsError, setDriveAssetsError] = useState<string | null>(null);
  const customAssetInputRef = useRef<HTMLInputElement>(null);

  // Initialize keyboard shortcuts
  useKeyboard();

  useEffect(() => { hydrateTabs(); }, [hydrateTabs]);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('instaeditor.drive.asset-folder');
      if (stored?.trim()) setDriveAssetFolder(stored.trim());
    } catch {
      // localStorage is optional.
    }
  }, []);

  const refreshDriveAssets = useCallback(async () => {
    const folder = driveAssetFolder.trim();
    if (!folder) return;
    setDriveAssetsLoading(true);
    setDriveAssetsError(null);
    try {
      const all: DriveAsset[] = [];
      let pageToken: string | undefined;
      let driveAccountId: number | undefined;
      for (let page = 0; page < 10; page += 1) {
        const response = await listDriveAssets(folder, driveAccountId, pageToken);
        driveAccountId = response.drive_account_id;
        all.push(...response.items);
        if (!response.next_page_token) break;
        pageToken = response.next_page_token;
      }
      setDriveAssets(all);
      try { localStorage.setItem('instaeditor.drive.asset-folder', folder); } catch { /* optional */ }
    } catch (error) {
      setDriveAssetsError(error instanceof Error ? error.message : 'Impossibile leggere gli asset Drive');
    } finally {
      setDriveAssetsLoading(false);
    }
  }, [driveAssetFolder]);

  useEffect(() => {
    if (sidebarTab === 'assets') void refreshDriveAssets();
  }, [refreshDriveAssets, sidebarTab]);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (Number.isFinite(stored)) {
        setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, stored)));
      }
    } catch {
      // localStorage is optional in private browsing.
    }
  }, []);

  const updateSidebarWidth = useCallback((width: number) => {
    const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
    setSidebarWidth(next);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
    } catch {
      // Keep the resize usable when storage is unavailable.
    }
  }, []);

  const handleSidebarResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    clearSidebarHideTimer();
    setSidebarPinned(true);
    sidebarResizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: PointerEvent) => {
      const start = sidebarResizeRef.current;
      if (!start) return;
      // The sidebar is anchored on the right, so dragging left makes it wider.
      updateSidebarWidth(start.startWidth + start.startX - moveEvent.clientX);
    };
    const handleEnd = () => {
      sidebarResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
  }, [clearSidebarHideTimer, sidebarWidth, updateSidebarWidth]);

  const handleSidebarResizeKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 20;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateSidebarWidth(sidebarWidth + step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateSidebarWidth(sidebarWidth - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateSidebarWidth(SIDEBAR_MIN_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateSidebarWidth(SIDEBAR_MAX_WIDTH);
    }
  }, [sidebarWidth, updateSidebarWidth]);

  // Auto-open sidebar when an object is selected, then hide it after five
  // seconds without pointer interaction. Hovering the visible handle/sidebar
  // cancels the timer and keeps it open while the user works.
  useEffect(() => {
    if (selectedIds.length > 0) {
      clearSidebarHideTimer();
      setSidebarPinned(true);
      scheduleSidebarAutoHide();
    } else {
      clearSidebarHideTimer();
      setSidebarPinned(false);
    }
    return () => {
      clearSidebarHideTimer();
    };
  }, [clearSidebarHideTimer, scheduleSidebarAutoHide, selectedIds]);

  const handleSidebarEnter = () => {
    clearSidebarHideTimer();
    setSidebarPinned(true);
  };

  const handleSidebarLeave = () => {
    scheduleSidebarAutoHide();
  };

  const handleObjectHover = useCallback((id: string | null) => {
    // Keep the contextual bar open after leaving the layer row: the user
    // needs time to move from the right sidebar down to the toolbar above
    // Text/Image/Shape/Crop and adjust the selected object there.
    if (id) setHoveredObjectId(id);
  }, []);

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
      openTab({ id: data.id, name: data.name });

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
      // Never carry the previous cover's canvas into a newly opened project.
      // Empty sessions must explicitly clear the store as well.
      const objects = sourceObjects
        .filter((value) => {
          const object = value as { id?: unknown; name?: unknown };
          const id = String(object.id || '').trim().toLowerCase();
          const name = String(object.name || '').trim().toLowerCase();
          // The old bootstrap document created an unwanted purple placeholder
          // called "Layer 0". It is not user artwork and must not be restored.
          return !(/^(layer[ _-]*0|layer0)$/.test(name) || /^(layer[ _-]*0|layer0)$/.test(id));
        })
        .map(scaleLegacyObject);

      ignoreNextObjectsRef.current = true;
      loadObjects(objects as Parameters<typeof loadObjects>[0]);

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
  }, [addToast, loadObjects, openTab, projectId, setCanvasSize, setCurrentProject, setDirty]);

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

  useEffect(() => {
    if (currentProject) renameTab(currentProject.id, currentProject.name || 'Senza nome');
  }, [currentProject, renameTab]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

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

  const switchEditorTab = useCallback(async (id: string) => {
    if (id === projectId) return;
    await requestEditorFlush();
    router.push(`${editorRuntimePath(`/editor/${encodeURIComponent(id)}`)}?return_to=${encodeURIComponent(editorReturnToPath())}`);
  }, [projectId, router]);

  const closeEditorTab = useCallback(async (id: string) => {
    if (id === projectId && isDirty && !window.confirm('Questa copertina ha modifiche non salvate. Chiuderla comunque?')) return;
    if (id === projectId) {
      await requestEditorFlush();
      const next = openTabs.filter((tab) => tab.id !== id);
      closeTab(id);
      const fallback = next[next.length - 1];
      if (fallback) {
        router.push(`${editorRuntimePath(`/editor/${encodeURIComponent(fallback.id)}`)}?return_to=${encodeURIComponent(editorReturnToPath())}`);
      } else {
        window.location.assign(returnUrl);
      }
    } else {
      closeTab(id);
    }
  }, [closeTab, isDirty, openTabs, projectId, returnUrl, router]);

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
        <main className={`editor-workspace relative flex-1 overflow-hidden p-12 flex items-center justify-center ${isDarkTheme ? 'bg-[#111318]' : 'bg-[#f7f7f5]'}`} style={{ marginRight: sidebarWidth }}>
          {/* Floating Top-Left Navigation Pill */}
          <div className={`editor-header absolute left-4 top-4 z-30 flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-xl ${isDarkTheme ? 'border-white/10 bg-[#17191f]/95' : 'border-black/[0.08] bg-white/[0.96]'}`}>
            <div className="flex max-w-[360px] items-center gap-1 overflow-x-auto pr-1">
              {openTabs.map((tab) => (
                <div key={tab.id} className={`group flex shrink-0 items-center rounded-lg border ${tab.id === projectId ? (isDarkTheme ? 'border-white/20 bg-white/10' : 'border-black/15 bg-black/[0.05]') : (isDarkTheme ? 'border-transparent' : 'border-transparent')} `}>
                  <button type="button" onClick={() => void switchEditorTab(tab.id)} className="max-w-[130px] truncate px-2 py-1 text-[10px] font-semibold text-[#4c4c50] hover:text-[#111111] dark:text-white/65 dark:hover:text-white" title={tab.name}>{tab.name}</button>
                  <button type="button" onClick={() => void closeEditorTab(tab.id)} className="mr-0.5 rounded p-0.5 text-[#9a9a9f] hover:bg-black/10 hover:text-[#111111] dark:hover:bg-white/10 dark:hover:text-white" title="Chiudi copertina" aria-label={`Chiudi ${tab.name}`}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            {/* Back to the InstaEdit Copertine hub of the group the user
                opened the editor from (relative return_to stamped by the
                SPA launch URL; falls back to the hub without a group). */}
            <a
              href={returnUrl}
              className={isDarkTheme ? 'text-white/65 transition-colors hover:text-white' : 'text-black/60 transition-colors hover:text-black'}
              title="Torna a Copertine"
            >
              <Home className="h-5 w-5" />
            </a>
            <span className={isDarkTheme ? 'select-none text-sm text-white/30' : 'select-none text-sm text-black/30'}>/</span>
            <div className="group relative max-w-[240px]">
              <input
                type="text"
                value={currentProject?.name || ''}
                onChange={handleProjectNameChange}
                onBlur={handleProjectNameBlur}
                placeholder="Senza nome"
                className={`w-full truncate rounded border-none bg-transparent px-1 py-1 text-sm font-semibold placeholder:italic transition-all duration-200 focus:outline-none focus:ring-1 ${isDarkTheme ? 'text-white placeholder:text-white/35 focus:bg-white/[0.06] focus:ring-white/15' : 'text-[#111111] placeholder:text-black/35 focus:bg-black/[0.03] focus:ring-black/10'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                />
            </div>
            <span
              className={isDarkTheme
                ? 'inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold tracking-wide text-white/55'
                : 'inline-flex shrink-0 items-center rounded-full border border-black/[0.08] bg-black/[0.035] px-2 py-1 text-[10px] font-semibold tracking-wide text-black/50'}
              aria-label="Versione InstaEdit"
              title="Versione InstaEdit"
            >
              InstaEdit 1.0
            </span>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className={isDarkTheme ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white' : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-black/[0.06] hover:text-black'}
              title={isFullscreen ? 'Esci da fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Esci da fullscreen' : 'Attiva fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <ThemeToggle />
          </div>

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
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          className="sidebar-shell fixed bottom-0 right-0 top-0 z-30 flex translate-x-0 flex-col"
          style={{ width: sidebarWidth } as React.CSSProperties}
        >
          {/* Trigger handle bar on the left edge of the sidebar */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 flex w-[28px] cursor-col-resize items-center justify-center border-r border-black/10 bg-black/5"
            role="separator"
            aria-label="Ridimensiona sidebar"
            aria-orientation="vertical"
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            onPointerDown={handleSidebarResizeStart}
            onKeyDown={handleSidebarResizeKeyDown}
            onDoubleClick={() => updateSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
            title="Trascina per ridimensionare · doppio clic per ripristinare"
          >
            <div className="w-1 h-12 rounded-full bg-black/20"></div>
          </div>
          <div className={`editor-sidebar-surface pl-[28px] flex flex-col h-full border-l shadow-[-10px_0_28px_rgba(0,0,0,0.08),inset_1px_0_0_rgba(0,0,0,0.03)] ${isDarkTheme ? 'bg-[#17191f] text-white border-white/10' : 'bg-white text-[#171717] border-black/[0.10]'}`} onClick={handleSidebarEnter}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden">
                <LayersPanel onLayerHover={handleObjectHover} />
              </div>
            </div>
            {/* Sidebar Tabs */}
            <div className="hidden flex gap-1 border-b border-black/[0.08] bg-white px-2 py-2 text-[11px] font-semibold select-none">
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
            <div className="hidden flex-1 overflow-y-auto min-h-0 flex flex-col">
              {showLegacySidebarPanels && sidebarTab === 'design' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div />
                  <div className="border-t border-black/[0.08] flex-1 overflow-hidden flex flex-col min-h-0">
                    <LayersPanel />
                  </div>
                </div>
              )}

              {showLegacySidebarPanels && sidebarTab === 'assets' && (
                <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
                  <div className="space-y-2 border-b border-black/[0.08] pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Asset Drive PNG</h4>
                      <button
                        type="button"
                        onClick={() => void refreshDriveAssets()}
                        disabled={driveAssetsLoading}
                        className="rounded-lg border border-black/10 px-2 py-1 text-[10px] font-semibold text-[#4c4c50] hover:bg-black/[0.04] disabled:opacity-50"
                      >
                        {driveAssetsLoading ? 'Carico…' : 'Aggiorna'}
                      </button>
                    </div>
                    <input
                      value={driveAssetFolder}
                      onChange={(event) => setDriveAssetFolder(event.target.value)}
                      onBlur={() => void refreshDriveAssets()}
                      aria-label="Cartella Drive asset PNG"
                      placeholder="ID cartella Google Drive"
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[11px] text-[#111111] outline-none focus:border-black/30"
                    />
                    {driveAssetsError && <p className="text-[11px] leading-relaxed text-red-600">{driveAssetsError}</p>}
                    {!driveAssetsLoading && !driveAssetsError && driveAssets.length === 0 && (
                      <p className="text-[11px] text-[#6e6e73]">Nessun PNG trovato nella cartella.</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {driveAssets.map((asset) => (
                        <button
                          type="button"
                          key={asset.id}
                          onClick={() => {
                            addObject({
                              id: uuidv4(), type: 'image', name: asset.name.replace(/\.png$/i, ''),
                              x: 100, y: 100, width: 300, height: 220, rotation: 0, scaleX: 1, scaleY: 1,
                              opacity: 1, visible: true, locked: false, src: driveAssetContentUrl(asset),
                            });
                            addToast({ type: 'success', message: `${asset.name} aggiunto al canvas` });
                          }}
                          className="flex flex-col items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-2 text-left hover:border-black/30 hover:bg-[#f7f7f5]"
                          title="Aggiungi al canvas"
                        >
                          <img src={asset.thumbnail_url || driveAssetContentUrl(asset)} alt="" className="h-16 w-full rounded-md object-contain bg-black/[0.03]" />
                          <span className="w-full truncate text-center text-[10px] font-semibold text-[#4c4c50]">{asset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Asset di Brand Precaricati</h4>
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
                          className="flex flex-col items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-2 text-left transition-all hover:border-black/30 hover:bg-[#f7f7f5]"
                        >
                          <img
                            src={asset.src}
                            alt={asset.name}
                            className="w-full h-16 object-cover rounded-md"
                          />
                          <span className="w-full truncate text-center text-[10px] font-semibold text-[#4c4c50]">{asset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-black/[0.08] pt-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Carica Asset Locale</h4>
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
                    <div className="space-y-2 border-t border-black/[0.08] pt-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Asset Condivisi ({customAssets.length})</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {customAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="group relative flex flex-col items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-2"
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
                              <span className="w-full truncate text-center text-[10px] font-semibold text-[#4c4c50]">{asset.name}</span>
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
