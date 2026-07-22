import { useCallback, useEffect, useRef, useState } from 'react';
import { getProject } from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

export interface UseProjectLoaderReturn {
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useProjectLoader(projectId: string): UseProjectLoaderReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ignoreNextObjectsRef = useRef(false);

  const { setCurrentProject, setDirty } = useProjectStore();
  const { loadObjects, objects } = useEditorStore();
  const { addToast } = useUIStore();

  const loadProject = useCallback(async () => {
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
    loadProject();
  }, [loadProject]);

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
    retry: loadProject,
  };
}
