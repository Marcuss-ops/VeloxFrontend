'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Home,
  Film,
  Type,
  Image as ImageIcon,
  Crop,
  Square,
  Circle,
  Wand2,
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
import { Input } from '@/components/ui/Input';
import Toolbar from '@/components/editor/Toolbar';
import ToolbarDock from './components/ToolbarDock';
import LayersPanel from '@/components/editor/LayersPanel';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import PresetPanel from '@/components/editor/PresetPanel';
import FilterPanel from '@/components/editor/FilterPanel';
import ExportDialog from '@/components/editor/ExportDialog';
import AIDialog from '@/components/editor/AIDialog';
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
import { getProject } from '@/lib/api';
import { uploadImage } from '@/lib/api';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { onEditorSaveRequest } from '@/lib/editorEvents';
import { addTemplate, deleteTemplate, loadTemplates, type EditorTemplate } from '@/lib/templates';
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
  
  const { loadObjects, setCanvasSize, addObject } = useEditorStore();
  const { setCurrentProject, setDirty, currentProject, isDirty, isSaving, saveProject, updateProjectName } = useProjectStore();
  const { addToast, showExportDialog, showAIDialog, showYouTubeDialog, showFeedPreviewDialog, setFeedPreviewDialog, showRightSidebar, toggleRightSidebar } = useUIStore();
  const { objects, canvasWidth, canvasHeight, selectedIds } = useEditorStore();
  const canvasRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasHydratedRef = useRef(false);
  const ignoreNextObjectsRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastPreviewAtRef = useRef<number>(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<EditorTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [sidebarTab, setSidebarTab] = useState<'design' | 'templates' | 'assets'>('design');
  const [customAssets, setCustomAssets] = useState<Array<{id: string, name: string, src: string}>>([]);
  const customAssetInputRef = useRef<HTMLInputElement>(null);

  // Initialize keyboard shortcuts
  useKeyboard();

  useEffect(() => {
    setTemplates(loadTemplates());
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

  const handleSaveTemplate = () => {
    const name = newTemplateName.trim() || `${currentProject?.name || 'Template'} ${new Date().toLocaleString()}`;
    const template: EditorTemplate = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      canvas: { objects, canvasWidth, canvasHeight },
    };
    addTemplate(template);
    const next = loadTemplates();
    setTemplates(next);
    setNewTemplateName('');
    addToast({ type: 'success', message: 'Template saved' });
  };

  const handleApplyTemplate = (template: EditorTemplate) => {
    ignoreNextObjectsRef.current = true;
    loadObjects(template.canvas.objects as Parameters<typeof loadObjects>[0]);
    setCanvasSize(template.canvas.canvasWidth, template.canvas.canvasHeight);
    setDirty(true);
    addToast({ type: 'success', message: `Applied template: ${template.name}` });
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setTemplates(loadTemplates());
  };

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
              <button
                onClick={() => setSidebarTab('design')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  sidebarTab === 'design' ? 'border-primary text-primary bg-slate-900/50' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Design
              </button>
              <button
                onClick={() => setSidebarTab('templates')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  sidebarTab === 'templates' ? 'border-primary text-primary bg-slate-900/50' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Template
              </button>
              <button
                onClick={() => setSidebarTab('assets')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  sidebarTab === 'assets' ? 'border-primary text-primary bg-slate-900/50' : 'border-transparent text-slate-400 hover:text-slate-200'
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

              {sidebarTab === 'templates' && (
                <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salva come Template</h4>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Nome template (es. Telegiornale)"
                        className="h-9 text-xs"
                      />
                      <Button size="sm" onClick={handleSaveTemplate} disabled={objects.length === 0}>
                        Salva
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Libreria Template ({templates.length})</h4>
                    {templates.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-2">Nessun template salvato. Crea uno stile e salvalo per riutilizzarlo in altre nicchie!</div>
                    ) : (
                      <div className="space-y-2">
                        {templates.map((t) => (
                          <div
                            key={t.id}
                            className="flex flex-col gap-2 border border-slate-800 rounded-lg p-2.5 bg-slate-950/40"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-200 truncate">{t.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button size="xs" variant="outline" onClick={() => handleApplyTemplate(t)}>
                                Applica
                              </Button>
                              <Button size="xs" variant="destructive" onClick={() => handleDeleteTemplate(t.id)}>
                                Elimina
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                            src: res.url.startsWith('http') || res.url.startsWith('data:') ? res.url : `/dark_editor_v2/${res.url}`,
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
      {showExportDialog && <ExportDialog />}
      {showAIDialog && <AIDialog />}
      {showYouTubeDialog && <YouTubeDialog />}
      <FeedPreviewDialog isOpen={showFeedPreviewDialog} onClose={() => setFeedPreviewDialog(false)} />

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name…"
              />
              <Button onClick={handleSaveTemplate} disabled={objects.length === 0}>
                Save
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="text-sm text-muted-foreground">No templates yet.</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 border border-border rounded-lg p-3 bg-card"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => handleApplyTemplate(t)}>
                        Apply
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteTemplate(t.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplates(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
