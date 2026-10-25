import { create } from 'zustand';
import {
  saveProject as apiSaveProject,
  deleteProject as apiDeleteProject,
} from '@/lib/api';

export interface Project {
  id: string;
  name: string;
  type: string;
  canvas_json: Record<string, unknown>;
  preview_url: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectState {
  // Current project
  currentProject: Project | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Project operations
  createProject: (name?: string) => Promise<Project | null>;
  saveProject: (canvasData: Record<string, unknown>, previewFilename?: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  updateProjectName: (name: string) => void;

  // Export operations
  exportProject: () => Promise<Blob | null>;
}

export const useProjectStore = create<ProjectState>((set, get) => {
  // Autosave can be triggered again while a previous request is still in
  // flight. Serialize writes so an older request can never finish after a
  // newer one and restore stale canvas data on the next reload.
  const queuedSaves: Array<{ payload: Parameters<typeof apiSaveProject>[0]; revision: number; waiters: Array<(value: boolean) => void> }> = [];
  let saveRunning = false;
  let saveRevision = 0;

  return ({
  currentProject: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  lastSaved: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLoading: (loading) => set({ isLoading: loading }),

  createProject: async (_name = 'Untitled Project') => {
    // Project handles are created by InstaEdit. Velox never creates a
    // standalone/global project, so this client operation is intentionally
    // unavailable and remains only for compatibility with old callers.
    set({ isLoading: false });
    return null;
  },

  saveProject: (canvasData, previewFilename) => {
    const project = get().currentProject;
    if (!project) return Promise.resolve(false);

    const revision = ++saveRevision;
    const payload: Parameters<typeof apiSaveProject>[0] = {
      id: project.id,
      name: project.name,
      type: project.type,
      // Keep a detached snapshot. The editor store may mutate its objects
      // before this queued write reaches the API.
      canvas_json: structuredClone(canvasData),
      preview_filename: previewFilename,
    };

    return new Promise<boolean>((resolve) => {
      const queuedIndex = queuedSaves.findIndex((item) => item.payload.id === payload.id);
      if (queuedIndex >= 0) {
        const previous = queuedSaves[queuedIndex];
        // The latest complete snapshot for this project wins while writes
        // are in flight; saves for other project tabs keep their own slot.
        queuedSaves[queuedIndex] = { payload, revision, waiters: [...previous.waiters, resolve] };
      } else {
        queuedSaves.push({ payload, revision, waiters: [resolve] });
      }
      if (saveRunning) return;
      saveRunning = true;
      void (async () => {
        while (queuedSaves.length > 0) {
          const current = queuedSaves.shift()!;
          set({ isSaving: true });
          let succeeded = false;
          try {
            await apiSaveProject(current.payload);
            succeeded = true;
            if (current.revision === saveRevision) set({ isDirty: false, isSaving: false, lastSaved: new Date() });
          } catch (error) {
            console.error('Failed to save project:', error);
            if (current.revision === saveRevision) set({ isSaving: false });
          }
          current.waiters.forEach((waiter) => waiter(succeeded));
        }
        saveRunning = false;
      })();
    });
  },

  deleteProject: async (id) => {
    try {
      await apiDeleteProject(id);

      const { currentProject } = get();
      if (currentProject?.id === id) {
        set({ currentProject: null });
      }

      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  },

  updateProjectName: (name) => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({
      currentProject: { ...currentProject, name },
      isDirty: true
    });
  },

  exportProject: async () => {
    // This will be implemented with actual export logic
    // For now, return null
    return null;
  },
  });
});
