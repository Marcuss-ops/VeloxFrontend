'use client';

import React, { useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import {
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
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[54px] p-1.5 rounded-xl transition-all group ${
        active 
          ? 'bg-primary/10 text-primary' 
          : 'hover:bg-primary/10 hover:text-primary'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      title={label}
    >
      {icon}
      <span className="text-[10px] font-medium opacity-70 group-hover:opacity-100">{label}</span>
    </button>
  );
}

// Floating Toolbar Dock Component
export default function ToolbarDock() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    activeTool, 
    setActiveTool, 
    setAIDialog, 
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
    updateObject,
    objects,
    selectedIds,
  } = useEditorStore();
  const { upscale } = useImageProcessor();
  
  const canUndo = pastPatches.length > 0;
  const canRedo = futurePatches.length > 0;
  
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
            src: result.url,
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
            src: result.url,
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
  
  const aiTools = [
    { id: 'ai-generate', icon: Wand2, label: 'AI' },
    { id: 'upscale', icon: Maximize, label: 'Upscale' },
    { id: 'feed-preview', icon: Eye, label: 'Feed' },
  ];
  
  const handleToolClick = async (toolId: string) => {
    if (toolId === 'image') {
      fileInputRef.current?.click();
      return;
    }

    if (toolId === 'text') {
      setActiveTool('text');
      addToast({ type: 'info', message: 'Click on the canvas to place text' });
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

    if (toolId === 'ai-generate') {
      setAIDialog(true);
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
      updateObject(selectedObject.id, { src: result.url });
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
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="glass-dock px-3 py-2 rounded-2xl flex items-center gap-1 shadow-dock">
          {/* Basic Tools */}
          {tools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <DockItem
                key={tool.id}
                icon={<IconComponent className="w-5 h-5" />}
                label={tool.label}
                onClick={() => handleToolClick(tool.id)}
                active={activeTool === tool.id}
              />
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[54px] p-1.5 rounded-xl transition-all group ${
                  selectedImage?.cropMode && selectedImage.cropMode !== 'free'
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-primary/10 hover:text-primary'
                }`}
                title="Crop"
                type="button"
              >
                <Crop className="w-5 h-5" />
                <span className="text-[10px] font-medium opacity-70 group-hover:opacity-100">Crop</span>
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
          
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          
          {/* AI Tools */}
          {aiTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <DockItem
                key={tool.id}
                icon={<IconComponent className="w-5 h-5" />}
                label={tool.label}
                onClick={() => handleToolClick(tool.id)}
              />
            );
          })}
          
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          
          {/* History & View Controls */}
          <div className="flex items-center gap-0.5">
            <DockItem
              icon={<Undo className="w-5 h-5" />}
              label="Undo"
              onClick={undo}
              disabled={!canUndo}
            />
            <DockItem
              icon={<Redo className="w-5 h-5" />}
              label="Redo"
              onClick={redo}
              disabled={!canRedo}
            />
            <DockItem
              icon={<Grid3x3 className="w-5 h-5" />}
              label="Grid"
              onClick={toggleGrid}
              active={showGrid}
            />
            <DockItem
              icon={<Magnet className={`w-5 h-5 ${snapToGrid ? 'text-primary' : ''}`} />}
              label="Snap"
              onClick={toggleSnapToGrid}
              active={snapToGrid}
            />
            <DockItem
              icon={<ZoomIn className="w-5 h-5" />}
              label={`${Math.round(zoom * 100)}%`}
              onClick={() => setZoom(zoom >= 1.5 ? 1 : Math.min(5, zoom * 1.25))}
              active={zoom !== 1}
            />
          </div>
          
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          
          <DockItem
            icon={<Share2 className="w-5 h-5 text-sky-400 group-hover:text-sky-300" />}
            label="Export"
            onClick={() => setExportDialog(true)}
          />
        </div>
      </div>
    </>
  );
}
