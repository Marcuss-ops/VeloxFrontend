'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';

const MAX_VERSIONS = 20;
const STORAGE_PREFIX = 'instaeditor.version-history.v1:';

export interface EditorVersion {
  id: string;
  createdAt: string;
  objects: CanvasObject[];
  canvasWidth: number;
  canvasHeight: number;
}

function storageKey(projectId: string) { return `${STORAGE_PREFIX}${projectId}`; }

export function useEditorVersionHistory(projectId: string) {
  const [versions, setVersions] = useState<EditorVersion[]>([]);
  const hydrated = useRef(false);
  const lastSignature = useRef('');
  const objects = useEditorStore((state) => state.objects);
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
  const setDirty = useProjectStore((state) => state.setDirty);

  useEffect(() => {
    hydrated.current = false;
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      const parsed = raw ? JSON.parse(raw) as EditorVersion[] : [];
      setVersions(Array.isArray(parsed) ? parsed.slice(0, MAX_VERSIONS) : []);
    } catch { setVersions([]); }
    const timer = window.setTimeout(() => { hydrated.current = true; }, 600);
    return () => window.clearTimeout(timer);
  }, [projectId]);

  const signature = useMemo(() => JSON.stringify({ objects, canvasWidth, canvasHeight }), [canvasHeight, canvasWidth, objects]);

  useEffect(() => {
    if (!projectId || !hydrated.current || signature === lastSignature.current) return;
    const timer = window.setTimeout(() => {
      const next: EditorVersion = {
        id: `version_${Date.now()}`,
        createdAt: new Date().toISOString(),
        objects: structuredClone(Object.values(objects)),
        canvasWidth,
        canvasHeight,
      };
      setVersions((current) => {
        const updated = [next, ...current].slice(0, MAX_VERSIONS);
        lastSignature.current = signature;
        try { localStorage.setItem(storageKey(projectId), JSON.stringify(updated)); } catch { /* storage is optional */ }
        return updated;
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [canvasHeight, canvasWidth, objects, projectId, signature]);

  const restoreVersion = useCallback((version: EditorVersion) => {
    const store = useEditorStore.getState();
    store.setCanvasSize(version.canvasWidth, version.canvasHeight);
    store.loadObjects(structuredClone(version.objects));
    setDirty(true);
    lastSignature.current = JSON.stringify({ objects: version.objects, canvasWidth: version.canvasWidth, canvasHeight: version.canvasHeight });
  }, [setDirty]);

  return { versions, restoreVersion };
}
