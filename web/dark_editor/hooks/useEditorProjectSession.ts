'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getProject } from '@/lib/api';
import { getEditorSessionByProject } from '@/lib/api/bff';
import { isScopedProjectId } from '@/lib/project-scope';
import { normalizeEditorCanvas } from '@/lib/editorCanvasNormalize';
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
      if (isScopedProjectId(projectId)) {
        try {
          // Use the authenticated BFF client: the raw fetch previously used
          // here carried no editor bearer, so the backend rejected it with
          // 401 and the source-thumbnail refresh silently degraded.
          const session = await getEditorSessionByProject(projectId);
          // Extended contract: thumbnail_url is the canonical wire name,
          // source_thumbnail_url the legacy fallback.
          sessionSourceThumbnail = String(session.thumbnail_url || session.source_thumbnail_url || '').trim();
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
      const normalized = normalizeEditorCanvas((data.canvas_json || {}) as {
        objects?: unknown[];
        width?: number;
        height?: number;
        canvasWidth?: number;
        canvasHeight?: number;
      }, {
        projectId,
        projectType: data.type,
        projectName: data.name,
        sessionSourceThumbnail,
      });
      if (Number.isFinite(normalized.width) && normalized.width > 0 && Number.isFinite(normalized.height) && normalized.height > 0) {
        setCanvasSize(normalized.width, normalized.height);
      }

      ignoreNextObjectsRef.current = true;
      loadObjects(normalized.objects);

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

  // Read the error message once here so the effect's dependency array stays
  // a primitive (SessionGateState['message'] only exists on the 'error'
  // variant, so it cannot be referenced in the deps array directly).
  const sessionErrorMessage = sessionGate.state === 'error' ? sessionGate.message : null;

  useEffect(() => {
    if (sessionGate.state === 'editable_editing' || sessionGate.state === 'editable_failed' || sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published' || sessionGate.state === 'readonly_unknown') {
      loadProject();
    } else if (sessionGate.state === 'not_found' || sessionGate.state === 'unauthorized') {
      setLoading(false);
      setError(sessionGate.state === 'unauthorized' ? 'Authentication required' : 'Editor project context not available');
    } else if (sessionGate.state === 'error') {
      setLoading(false);
      setError(sessionErrorMessage ?? 'Failed to validate editor session');
    }
  }, [loadProject, sessionErrorMessage, sessionGate.state]);

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
