'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getProject } from '@/lib/api';
import { editorProjectContextPath } from '@/lib/editor-runtime';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useEditorTabsStore } from '@/stores/editorTabsStore';
import { useYouTubeSessionGate, type SessionGateState } from '@/hooks/useYouTubeSessionGate';

export interface UseEditorProjectSessionReturn {
  /** Discriminated YouTube session gate state (drives read-only / errors). */
  sessionGate: SessionGateState;
  /** True while the project row is being fetched (renders the loading screen). */
  loading: boolean;
  /** Error message from the last failed load; null on success/idle. */
  error: string | null;
  /**
   * Becomes true once the project row has been hydrated into the editor
   * store. Shared with useEditorAutosave so saves never run before the
   * initial load (or against the objects array just set by the loader).
   */
  hydratedRef: React.MutableRefObject<boolean>;
}

/**
 * Owns the editor's session lifecycle:
 *   - YouTube session gate (see useYouTubeSessionGate).
 *   - Project load with the legacy 1280x720 → 1920x1080 migration, the
 *     source-thumbnail refresh for `ve_*` sessions and the "Layer 0"
 *     placeholder purge.
 *   - Tab registration for the opened project.
 *   - The dirty flag that flips as soon as the user edits the hydrated
 *     canvas (initial load is explicitly ignored).
 *
 * The loading/error state machine maps the gate's discriminated state to
 * what the consumer should render (spinner / gate error / editor).
 */
export function useEditorProjectSession(projectId: string): UseEditorProjectSessionReturn {
  const sessionGate = useYouTubeSessionGate(projectId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef(false);
  const ignoreNextObjectsRef = useRef(false);

  const { loadObjects, setCanvasSize } = useEditorStore();
  const { setCurrentProject, setDirty } = useProjectStore();
  const { addToast } = useUIStore();
  const { openTab } = useEditorTabsStore();
  const objects = useEditorStore((state) => state.objects);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProject(projectId);

      // Refresh the source for older sessions that persisted a dead CDN URL.
      // This keeps the editor image identical to the channel-card thumbnail.
      let sessionSourceThumbnail = '';
      if (projectId.startsWith('ve_')) {
        try {
          const sessionResponse = await fetch(editorProjectContextPath(projectId), { cache: 'no-store' });
          if (sessionResponse.ok) {
            const session = await sessionResponse.json() as { source_thumbnail_url?: string };
            sessionSourceThumbnail = String(session.source_thumbnail_url || '').trim();
          }
        } catch {
          // The persisted project remains usable if the session lookup fails.
        }
      }

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
      openTab({ id: data.id, name: data.name });

      // YouTube thumbnails use one canonical document size everywhere.
      // Older sessions were authored at 1280x720, so migrate their logical
      // coordinates once into the 1920x1080 document instead of rendering a
      // small image in the top-left corner.
      const canvas = (data.canvas_json || {}) as {
        objects?: unknown[];
        width?: number;
        height?: number;
        canvasWidth?: number;
        canvasHeight?: number;
      };
      const sourceObjects = Array.isArray(canvas.objects) ? canvas.objects : [];
      // Editor sessions created by InstaEdit use the `ve_*` id and may have
      // an arbitrary E2E/draft title (for example `InstaEdit E2E ...`). Do
      // not use the display title as the document-type discriminator: those
      // sessions still need the canonical 1920x1080 migration.
      const isYouTubeThumbnail = projectId.startsWith('ve_')
        || data.type === 'youtube_thumbnail'
        || /^YouTube thumbnail\b/i.test(data.name)
        || sourceObjects.some((value) => {
          const object = value as { type?: string; name?: string };
          return object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail');
        });
      const storedWidth = Number(canvas.canvasWidth ?? canvas.width);
      const storedHeight = Number(canvas.canvasHeight ?? canvas.height);
      const normalizedWidth = isYouTubeThumbnail ? 1920 : storedWidth;
      const normalizedHeight = isYouTubeThumbnail ? 1080 : storedHeight;
      if (Number.isFinite(normalizedWidth) && normalizedWidth > 0 && Number.isFinite(normalizedHeight) && normalizedHeight > 0) {
        setCanvasSize(normalizedWidth, normalizedHeight);
      }

      const legacyThumbnail = isYouTubeThumbnail && (
        (storedWidth === 1280 && storedHeight === 720)
        || sourceObjects.some((value) => {
          const object = value as { type?: string; name?: string; width?: number; height?: number };
          return object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail') && object.width === 1280 && object.height === 720;
        })
      );
      const scaleLegacyObject = (value: unknown) => {
        const object = value as Record<string, unknown>;
        const isSourceThumbnail = object.type === 'image'
          && String(object.name || '').toLowerCase().includes('source thumbnail');
        // The source thumbnail is the document background. Older saved
        // sessions can contain a bad pan (for example x=-62/y=-411) even
        // though their document is already 1920x1080; that pan is exactly
        // what produces the visible blank band below the image.
        if (!legacyThumbnail && !(isYouTubeThumbnail && isSourceThumbnail)) return value;
        const scale = (key: string) => typeof object[key] === 'number' ? (object[key] as number) * 1.5 : object[key];
        const scaleNested = (key: string, keys: string[]) => {
          const nested = object[key];
          if (!nested || typeof nested !== 'object') return nested;
          return Object.fromEntries(Object.entries(nested as Record<string, unknown>).map(([name, nestedValue]) => [name, keys.includes(name) && typeof nestedValue === 'number' ? nestedValue * 1.5 : nestedValue]));
        };
        const next: Record<string, unknown> = {
          ...object,
          x: scale('x'), y: scale('y'), width: scale('width'), height: scale('height'),
          fontSize: scale('fontSize'), padding: scale('padding'), letterSpacing: scale('letterSpacing'), strokeWidth: scale('strokeWidth'),
          textShadow: scaleNested('textShadow', ['offsetX', 'offsetY', 'blur']),
          textStroke: scaleNested('textStroke', ['width']),
          dropShadow: scaleNested('dropShadow', ['offsetX', 'offsetY', 'blur', 'spread']),
        };
        if (isYouTubeThumbnail && isSourceThumbnail) {
          next.x = 0; next.y = 0; next.width = 1920; next.height = 1080; next.scaleX = 1; next.scaleY = 1;
          if (sessionSourceThumbnail) next.src = sessionSourceThumbnail;
        }
        return next;
      };
      // Never carry the previous cover's canvas into a newly opened project.
      // Empty sessions must explicitly clear the store as well.
      const objects = sourceObjects
        .filter((value) => {
          const object = value as { id?: unknown; name?: unknown };
          const id = String(object.id || '').trim().toLowerCase();
          const name = String(object.name || '').trim().toLowerCase();
          // The old bootstrap document created an unwanted purple placeholder
          // called "Layer 0". It is not user artwork and must not be restored.
          return !(/^(layer[ _-]*0|layer0)$/.test(name) || /^(layer[ _-]*0|layer0)$/.test(id));
        })
        .map(scaleLegacyObject);

      ignoreNextObjectsRef.current = true;
      loadObjects(objects as Parameters<typeof loadObjects>[0]);

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
  }, [addToast, loadObjects, openTab, projectId, setCanvasSize, setCurrentProject, setDirty]);

  useEffect(() => {
    if (sessionGate.state === 'editable_editing' || sessionGate.state === 'editable_failed' || sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published') {
      loadProject();
    } else if (sessionGate.state === 'not_found' || sessionGate.state === 'unauthorized') {
      setLoading(false);
      setError(sessionGate.state === 'unauthorized' ? 'Authentication required' : 'Editor project context not available');
    } else if (sessionGate.state === 'error') {
      setLoading(false);
      setError(sessionGate.message);
    }
  }, [loadProject, sessionGate.state]);

  // Mark the project dirty when objects change, but ignore the initial load.
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (ignoreNextObjectsRef.current) {
      ignoreNextObjectsRef.current = false;
      return;
    }
    setDirty(true);
  }, [objects, setDirty]);

  return {
    sessionGate,
    loading,
    error,
    hydratedRef: hasHydratedRef,
  };
}
