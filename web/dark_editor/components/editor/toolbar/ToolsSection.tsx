'use client';

import React, { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { resolveEditorAssetUrl } from '@/lib/api';
import {
  Type,
  Image as ImageIcon,
  Crop,
  Square,
  Circle,
  Maximize,
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
import { DockItem } from './DockItem';

/**
 * ToolsSection — the creation/insertion tools of the toolbar dock: text,
 * image (file upload), shape, circle, crop and the utility tools (upscale,
 * feed preview). Extracted from ToolbarDock.tsx.
 */
export function ToolsSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    activeTool,
    setActiveTool,
    setUploading,
    addToast,
    setFeedPreviewDialog,
    startCropEditing,
  } = useUIStore();
  const {
    addObject,
    selectObject,
    updateObject,
    selectedIds,
  } = useEditorStore();
  const objects = useObjectsArray();
  const { upscale } = useImageProcessor();

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

  const selectedImage = objects.find((obj): obj is ImageObject => selectedIds.includes(obj.id) && obj.type === 'image') ?? null;

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

      <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 ring-1 ring-black/[0.05] dark:bg-[#242832] dark:ring-white/10">
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
              className={`tool-button group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                selectedImage?.cropMode && selectedImage.cropMode !== 'free'
                  ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
                  : 'text-black/60 hover:bg-black/[0.06] hover:text-black dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
              title="Crop"
              aria-label="Crop"
              type="button"
            >
              <Crop className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span className="pointer-events-none absolute bottom-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#111111] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">Crop</span>
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

      <div className="mx-1 h-7 w-px shrink-0 bg-black/[0.08] dark:bg-white/10"></div>

      <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 ring-1 ring-black/[0.05] dark:bg-[#242832] dark:ring-white/10">
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
    </>
  );
}
