import { create } from 'zustand';
import { CanvasObject } from './editorStore';
import { 
  listProjects, 
  saveProject as apiSaveProject, 
  getProject as apiGetProject, 
  deleteProject as apiDeleteProject,
  Project as APIProject 
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
  loadProject: (id: string) => Promise<Project | null>;
  saveProject: (canvasData: Record<string, unknown>, previewFilename?: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  updateProjectName: (name: string) => void;
  
  // Export operations
  exportProject: (format: string, quality: number) => Promise<Blob | null>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  lastSaved: null,
  
  setCurrentProject: (project) => set({ currentProject: project }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  createProject: async (name = 'Untitled Project') => {
    set({ isLoading: true });
    try {
      const result = await apiSaveProject({
        name,
        type: 'project',
        canvas_json: {},
      });
      
      const project: Project = {
        id: result.id,
        name: name,
        type: 'project',
        canvas_json: {},
        preview_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      set({ currentProject: project, isDirty: false, isLoading: false });
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      set({ isLoading: false });
      return null;
    }
  },
  
  loadProject: async (id) => {
    set({ isLoading: true });
    try {
      const data = await apiGetProject(id);
      
      const project: Project = {
        id: data.id,
        name: data.name,
        type: data.type,
        canvas_json: data.canvas_json,
        preview_url: data.preview_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set({ currentProject: project, isDirty: false, isLoading: false });
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      set({ isLoading: false });
      return null;
    }
  },
  
  saveProject: async (canvasData, previewFilename) => {
    const { currentProject } = get();
    if (!currentProject) return false;
    
    set({ isSaving: true });
    try {
      await apiSaveProject({
        id: currentProject.id,
        name: currentProject.name,
        type: currentProject.type,
        canvas_json: canvasData,
        preview_filename: previewFilename,
      });
      
      set({ isDirty: false, isSaving: false, lastSaved: new Date() });
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      set({ isSaving: false });
      return false;
    }
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
  
  exportProject: async (format, quality) => {
    // This will be implemented with actual export logic
    // For now, return null
    console.log('Export project:', format, quality);
    return null;
  },
}));