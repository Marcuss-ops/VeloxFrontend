'use client';

import { v4 as uuidv4 } from 'uuid';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { resolveEditorAssetUrl } from '@/lib/api';
import {
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Maximize,
  Eye,
} from 'lucide-react';
import { DockItem } from './DockItem';
import { CropDropdown } from './CropDropdown';
import { useImageUpload } from './useImageUpload';

/**
 * ToolsSection — the creation/insertion tools of the toolbar dock: text,
 * image (file upload), shape, circle, crop (CropDropdown) and the utility
 * tools (upscale, feed preview). The image upload flow lives in
 * useImageUpload; the crop menu in CropDropdown.
 */
export function ToolsSection() {
  const { activeTool, setActiveTool, addToast, setFeedPreviewDialog } = useUIStore();
  const { addObject, selectObject, updateObject, selectedIds } = useEditorStore();
  const objects = useObjectsArray();
  const { upscale } = useImageProcessor();
  const { fileInputRef, openFileDialog, handleFileChange } = useImageUpload();

  const tools = [
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'rect', icon: Square, label: 'Shape' },
    { id: 'circle', icon: Circle, label: 'Circle' },
  ];

  const utilityTools = [
    { id: 'upscale', icon: Maximize, label: 'Upscale' },
    { id: 'feed-preview', icon: Eye, label: 'Feed' },
  ];

  const handleToolClick = async (toolId: string) => {
    if (toolId === 'image') {
      openFileDialog();
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

        <CropDropdown />
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
