'use client';

import { useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { resolveEditorAssetUrl } from '@/lib/api';

/**
 * useImageUpload — owns the image file upload + insertion flow: the hidden
 * file input ref, the dialog trigger and the change handler that uploads the
 * file, sizes it down to a 400px max and adds the image object. Extracted
 * from ToolsSection.
 */
export function useImageUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setUploading } = useUIStore();
  const { addObject } = useEditorStore();

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
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
    },
    [addObject, setUploading]
  );

  return { fileInputRef, openFileDialog, handleFileChange };
}
