import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { resolveEditorAssetUrl, uploadImage } from '@/lib/api';
import { collectDroppedFiles, isImageLike, readDroppedImageUrl } from '@/lib/imageDropValidation';

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

      const { setUploading } = useUIStore.getState();

      const uploadAndAdd = async (file: File) => {
        const result = await uploadImage(file);
        const src = resolveEditorAssetUrl(result.url);

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
      };

      const dropped = collectDroppedFiles(e);
      const imageFiles = dropped.filter((file) => isImageLike(file));

      if (imageFiles.length > 0) {
        setUploading(true);
        try {
          for (const file of imageFiles) {
            await uploadAndAdd(file);
          }
          addToast({
            type: 'success',
            message: `Aggiunte ${imageFiles.length} ${imageFiles.length === 1 ? 'immagine' : 'immagini'}`,
          });
        } catch (error) {
          console.error('Drop upload failed:', error);
          addToast({ type: 'error', message: 'Caricamento immagine non riuscito. Riprova.' });
        } finally {
          setUploading(false);
        }
        return;
      }

      // No image file: an <img> dragged from another page/tab only carries
      // its URL. Fetch it and upload the bytes so the drop still works.
      const url = await readDroppedImageUrl(e.dataTransfer);
      if (url) {
        setUploading(true);
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`fetch ${url} -> ${response.status}`);
          const blob = await response.blob();
          if (blob.type && !blob.type.startsWith('image/')) {
            throw new Error(`dropped URL is not an image (${blob.type})`);
          }
          const file = new File([blob], `dragged-${Date.now()}.png`, {
            type: blob.type || 'image/png',
          });
          await uploadAndAdd(file);
          addToast({ type: 'success', message: 'Immagine aggiunta al canvas' });
        } catch (error) {
          console.error('Dropped URL upload failed:', error);
          addToast({
            type: 'error',
            message: "Impossibile caricare l'immagine trascinata da un altro sito. Scaricala e usa il pulsante Upload.",
          });
        } finally {
          setUploading(false);
        }
        return;
      }

      // Nothing image-like was dropped: surface it instead of staying silent.
      addToast({
        type: 'warning',
        message: 'Trascina qui un file immagine (PNG, JPG, WEBP…) per aggiungerlo al canvas.',
      });
    },
    [addObject, addToast, maxDim],
  );

  return {
    isDragging,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
