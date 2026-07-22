import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { uploadImage } from '@/lib/api';

export interface UseDragDropUploadReturn {
  isDragging: boolean;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
}

function constrainDimensions(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= max && height <= max) {
    return { width, height };
  }
  if (width > height) {
    return { width: max, height: Math.round((height / width) * max) };
  }
  return { width: Math.round((width / height) * max), height: max };
}

function loadImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 400,
        height: img.naturalHeight || img.height || 300,
      });
    };
    img.onerror = () => {
      resolve({ width: 400, height: 300 });
    };
  });
}

export function useDragDropUpload(maxDim = 400): UseDragDropUploadReturn {
  const [isDragging, setIsDragging] = useState(false);
  const { addObject } = useEditorStore();
  const { addToast } = useUIStore();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
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
          const src =
            result.url.startsWith('http') || result.url.startsWith('data:')
              ? result.url
              : `/dark_editor_v2/${result.url}`;

          const dimensions = await loadImage(src);
          const { width, height } = constrainDimensions(dimensions.width, dimensions.height, maxDim);

          addObject({
            id: uuidv4(),
            type: 'image',
            name: file.name,
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50,
            width,
            height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            visible: true,
            locked: false,
            src,
          });
        }

        addToast({ type: 'success', message: `Added ${imageFiles.length} image(s)` });
      } catch (error) {
        console.error('Drop upload failed:', error);
        addToast({ type: 'error', message: 'Failed to upload one or more images' });
      } finally {
        setUploading(false);
      }
    },
    [addObject, addToast, maxDim]
  );

  return {
    isDragging,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
