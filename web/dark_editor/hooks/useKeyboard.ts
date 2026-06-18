'use client';

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { requestEditorSave } from '@/lib/editorEvents';

export function useKeyboard() {
  const {
    undo,
    redo,
    pastPatches,
    futurePatches,
    setZoom,
    zoom,
    deleteSelected,
    duplicateSelected,
    selectedIds,
    selectAll,
    clearSelection,
    copySelected,
    pasteClipboard,
  } = useEditorStore();

  const { setActiveTool, setExportDialog, setAIDialog, toggleGrid } = useUIStore();

  const canUndo = pastPatches.length > 0;
  const canRedo = futurePatches.length > 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore if typing in input, textarea, or content-editable element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (target && target.isContentEditable)
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Undo/Redo
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        if (shift) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
        return;
      }

      if (ctrl && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Save
      if (ctrl && e.key === 's') {
        e.preventDefault();
        requestEditorSave();
        return;
      }

      // Select All
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Duplicate
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Copy
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }

      // Paste
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Tools
      switch (e.key.toLowerCase()) {
        case 'e':
          e.preventDefault();
          setExportDialog(true);
          break;
        case 'g':
          e.preventDefault();
          toggleGrid();
          break;
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'r':
        case 'u': // Classic Photoshop shortcut for Shape
          setActiveTool('rect');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        case 'i':
          e.preventDefault();
          (document.querySelector('input[type="file"]') as HTMLInputElement)?.click();
          break;
      }

      // Zoom
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(zoom * 1.25);
      }
      if (ctrl && e.key === '-') {
        e.preventDefault();
        setZoom(zoom / 1.25);
      }
      if (ctrl && e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      }

      // Escape - clear selection
      if (e.key === 'Escape') {
        clearSelection();
        setExportDialog(false);
        setAIDialog(false);
      }
    },
    [
      undo,
      redo,
      canUndo,
      canRedo,
      setActiveTool,
      setZoom,
      zoom,
      deleteSelected,
      duplicateSelected,
      selectedIds,
      selectAll,
      clearSelection,
      copySelected,
      pasteClipboard,
      setExportDialog,
      setAIDialog,
      toggleGrid,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    canUndo,
    canRedo,
  };
}
