import { useCallback, useEffect, useRef, useState } from 'react';
import { getProject } from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import type { SessionGateState } from '@/hooks/useYouTubeSessionGate';

export interface UseProjectLoaderReturn {
  /** True while the loader is fetching the project row. */
  loading: boolean;
  /** Error message from the last failed fetch; null on success/idle. */
  error: string | null;
  /**
   * True when the gate resolved to a readonly_* state. The caller
   * MUST mount the Canvas in read-only mode (banner + mutations
   * disabled) when this is true. False when editable_* or when the
   * gate is in a state that should not mount the Canvas at all.
   */
  readonly: boolean;
  /** Re-run the loader. No-op when the gate forbids fetching. */
  retry: () => void;
}

/**
 * Project loader, gated on the YouTube session gate.
 *
 * Decides whether to fetch the Velox project row based on the gate's
 * discriminated state:
 *   - editable_editing | editable_failed
 *       → fetch normally; readonly=false (Canvas mounts in full editor
 *         mode).
 *   - readonly_publishing | readonly_published
 *       → fetch normally; readonly=true (Canvas mounts in read-only
 *         mode with banner + disabled mutations).
 *   - loading | not_found | unauthorized | error
 *       → do NOT fetch; loading=false, readonly=false (Canvas must
 *         NOT mount — the consumer renders the gate UI instead).
 *
 * The loader never overrules the gate: it never mounts the Canvas on
 * its own and never fetches the project when the gate forbids it.
 * Mounting the Canvas is always the consumer's call. This means a
 * direct hit to /dark_editor_v2/editor/<unknown-id> that 404s the
 * gate will NOT trigger a second fetch from the loader — the page
 * renders SessionGateError and stays there.
 */
export function useProjectLoader(
  gate: SessionGateState,
  projectId: string,
): UseProjectLoaderReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ignoreNextObjectsRef = useRef(false);

  const { setCurrentProject, setDirty } = useProjectStore();
  const { loadObjects, objects } = useEditorStore();
  const { addToast } = useUIStore();

  // Derive mode from the gate's discriminated state. The loader's
  // contract is encoded in these two booleans:
  //   shouldFetch: should we hit GET /dark_editor_v2/api/projects/{id}?
  //   readonly:    should the Canvas be read-only after a successful load?
  // Both flags are stable for the lifetime of the gate state. When the
  // gate resolves to a different state (e.g. publishing → editing after
  // a retry), the useEffect re-fires and the consumer re-renders.
  const shouldFetch =
    gate.state === 'editable_editing' ||
    gate.state === 'editable_failed' ||
    gate.state === 'readonly_publishing' ||
    gate.state === 'readonly_published';

  const readonly =
    gate.state === 'readonly_publishing' ||
    gate.state === 'readonly_published';

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getProject(projectId);

      setCurrentProject({
        id: data.id,
        name: data.name,
        type: data.type,
        canvas_json: data.canvas_json,
        preview_url: data.preview_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });

      if (data.canvas_json && Array.isArray((data.canvas_json as { objects?: unknown[] }).objects)) {
        ignoreNextObjectsRef.current = true;
        loadObjects((data.canvas_json as { objects: unknown[] }).objects as Parameters<typeof loadObjects>[0]);
      }

      setDirty(false);
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
  }, [addToast, loadObjects, projectId, setCurrentProject, setDirty]);

  useEffect(() => {
    if (!shouldFetch) {
      // Gate is loading | not_found | unauthorized | error — short-circuit.
      // The consumer is rendering the gate UI; no fetch, no Canvas mount.
      setLoading(false);
      setError(null);
      return;
    }
    loadProject();
  }, [shouldFetch, loadProject]);

  // Mark project dirty when objects change, but ignore the initial load.
  useEffect(() => {
    if (ignoreNextObjectsRef.current) {
      ignoreNextObjectsRef.current = false;
      return;
    }
    setDirty(true);
  }, [objects, setDirty]);

  return {
    loading,
    error,
    readonly,
    retry: loadProject,
  };
}
