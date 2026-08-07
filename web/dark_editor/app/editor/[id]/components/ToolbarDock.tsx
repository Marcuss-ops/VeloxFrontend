'use client';

import React, { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { resolveEditorAssetUrl } from '@/lib/api';
import {
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
  Share2,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

// Helper component for ToolbarDock items
interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function DockItem({ icon, label, onClick, disabled = false, active = false }: DockItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all group ${
        active
          ? 'bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/35 shadow-[0_0_18px_rgba(56,189,248,0.16)]'
          : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'
      } ${disabled ? 'opacity-25 cursor-not-allowed' : ''}`}
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="pointer-events-none absolute left-12 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950/95 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 shadow-xl ring-1 ring-white/10 group-hover:block">{label}</span>
    </button>
  );
}

// Floating Toolbar Dock Component
export default function ToolbarDock() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    activeTool,
    setActiveTool,
    setUploading,
    addToast,
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnapToGrid,
    setFeedPreviewDialog,
    startCropEditing,
    setExportDialog,
  } = useUIStore();
  const {
    undo,
    redo,
    pastPatches,
    futurePatches,
    zoom,
    setZoom,
    addObject,
    selectObject,
    updateObject,
    objects,
    selectedIds,
  } = useEditorStore();
  const { upscale } = useImageProcessor();

  const canUndo = pastPatches.length > 0;
  const canRedo = futurePatches.length > 0;

  const openExport = () => setExportDialog(true);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { uploadImage } = await import('@/lib/api');
      const result = await uploadImage(file);
      const { v4: uuidv4 } = await import('uuid');
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
            x: 100,
            y: 100,
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
            x: 100,
            y: 100,
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
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const tools = [
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'image', icon: ImageIcon, label: 'Image', isFileInput: true },
    { id: 'rect', icon: Square, label: 'Shape' },
    { id: 'circle', icon: Circle, label: 'Circle' },
  ];

  const utilityTools = [
    { id: 'upscale', icon: Maximize, label: 'Upscale' },
    { id: 'feed-preview', icon: Eye, label: 'Feed' },
  ];

  const handleToolClick = async (toolId: string) => {
    if (toolId === 'image') {
      fileInputRef.current?.click();
      return;
    }

    if (toolId === 'text') {
      // Insert a visible text layer immediately. The previous behaviour only
      // armed the tool and required a second click on the canvas, which made
      // the TXT button appear broken to users.
      const id = uuidv4();
      addObject({
        id,
        type: 'text',
        name: 'Text',
        text: 'Testo',
        translate: true,
        x: 120,
        y: 120,
        width: 520,
        height: 96,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        fill: '#111111',
        fontSize: 48,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        lineHeight: 1.1,
        padding: 6,
      });
      selectObject(id);
      setActiveTool('select');
      addToast({ type: 'success', message: 'Testo aggiunto alla canvas' });
      return;
    }

    if (toolId === 'rect') {
      setActiveTool('rect');
      addToast({ type: 'info', message: 'Click on the canvas to place a shape' });
      return;
    }

    if (toolId === 'circle') {
      setActiveTool('circle');
      addToast({ type: 'info', message: 'Click on the canvas to place a circle' });
      return;
    }

    if (toolId === 'feed-preview') {
      setFeedPreviewDialog(true);
      return;
    }

    if (toolId === 'upscale') {
      const selectedObject = objects.find((obj) => selectedIds[0] === obj.id);
      if (!selectedObject || selectedObject.type !== 'image' || !selectedObject.src) {
        addToast({ type: 'warning', message: 'Please select an image to upscale' });
        return;
      }
      const filename = selectedObject.src.split('/').pop() || '';
      if (!filename) {
        addToast({ type: 'error', message: 'Unable to determine image filename' });
        return;
      }
      const result = await upscale(filename, 2);
      updateObject(selectedObject.id, { src: resolveEditorAssetUrl(result.url) });
      return;
    }
  };

  const selectedImage = objects.find((obj) => selectedIds.includes(obj.id) && obj.type === 'image') ?? null;

  const applyCropMode = (mode: 'free' | 'square' | 'circle') => {
    if (!selectedImage) {
      addToast({ type: 'warning', message: 'Seleziona prima un’immagine' });
      return;
    }
    startCropEditing(selectedImage.id, mode);
    addToast({
      type: 'info',
      message: mode === 'circle' ? 'Crop cerchio pronto: trascina i bordi e premi Invio' : mode === 'square' ? 'Crop quadrato pronto: trascina i bordi e premi Invio' : 'Crop libero pronto: trascina i bordi e premi Invio',
    });
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="absolute left-4 top-1/2 z-30 max-h-[calc(100vh-2rem)] -translate-y-1/2">
        <div className="glass-dock flex max-h-[calc(100vh-2rem)] flex-col items-center gap-1.5 overflow-y-auto overflow-x-visible rounded-2xl border border-white/[0.10] bg-slate-950/80 px-2 py-2.5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/[0.045] p-1 ring-1 ring-white/[0.06]">
            {/* Basic Tools */}
            {tools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <DockItem
                key={tool.id}
                icon={<IconComponent className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                label={tool.label}
                onClick={() => handleToolClick(tool.id)}
                active={activeTool === tool.id}
              />
            );
            })}

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all group ${
                  selectedImage?.cropMode && selectedImage.cropMode !== 'free'
                    ? 'bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/35'
                    : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'
                }`}
                title="Crop"
                aria-label="Crop"
                type="button"
              >
                <Crop className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="pointer-events-none absolute left-12 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950/95 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 shadow-xl ring-1 ring-white/10 group-hover:block">Crop</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top">
              <DropdownMenuLabel>Crop</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => applyCropMode('free')}>
                Crop libero
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyCropMode('square')}>
                Crop quadrato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyCropMode('circle')}>
                Crop cerchio
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mx-1 h-px w-7 bg-white/10"></div>

          <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/[0.045] p-1 ring-1 ring-white/[0.06]">
            {/* Utility Tools */}
            {utilityTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <DockItem
                key={tool.id}
                icon={<IconComponent className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                label={tool.label}
                onClick={() => handleToolClick(tool.id)}
              />
            );
            })}
          </div>

          <div className="mx-1 h-px w-7 bg-white/10"></div>

          {/* History & View Controls */}
          <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/[0.045] p-1 ring-1 ring-white/[0.06]">
            <DockItem
              icon={<Undo className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label="Undo"
              onClick={undo}
              disabled={!canUndo}
            />
            <DockItem
              icon={<Redo className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label="Redo"
              onClick={redo}
              disabled={!canRedo}
            />
            <DockItem
              icon={<Grid3x3 className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label="Grid"
              onClick={toggleGrid}
              active={showGrid}
            />
            <DockItem
              icon={<Magnet className={`h-[18px] w-[18px] ${snapToGrid ? 'text-sky-200' : ''}`} strokeWidth={1.8} />}
              label="Snap"
              onClick={toggleSnapToGrid}
              active={snapToGrid}
            />
            <DockItem
              icon={<ZoomIn className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label={`${Math.round(zoom * 100)}%`}
              onClick={() => setZoom(zoom >= 1.5 ? 1 : Math.min(5, zoom * 1.25))}
              active={zoom !== 1}
            />
          </div>

          <div className="mx-1 h-px w-7 bg-white/10"></div>

          <div className="rounded-xl bg-sky-400/10 p-1 ring-1 ring-sky-300/20">
            <DockItem
              icon={<Share2 className="h-[18px] w-[18px] text-sky-300" strokeWidth={1.8} />}
              label="Export"
              onClick={openExport}
            />
          </div>
        </div>
      </div>
    </>
  );
}
