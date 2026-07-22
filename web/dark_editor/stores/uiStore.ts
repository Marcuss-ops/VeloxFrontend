import { create } from 'zustand';

export type Tool = 'select' | 'pan' | 'text' | 'rect' | 'circle' | 'image' | 'blur' | 'sharpen' | 'pixelation';
export type CropMode = 'free' | 'square' | 'circle';
export interface UIState {
  // Active tool
  activeTool: Tool;

  // Canvas helpers
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  
  // Panels visibility
  showLayersPanel: boolean;
  showPropertiesPanel: boolean;
  showRightSidebar: boolean;
  showExportDialog: boolean;
  showAIDialog: boolean;
  showFeedPreviewDialog: boolean;
  
  // Toast notifications
  toasts: Toast[];
  
  // Loading states
  isGenerating: boolean;
  isUploading: boolean;
  isExporting: boolean;

  // Editing states
  editingId: string | null;
  cropEditingId: string | null;
  cropEditingMode: CropMode | null;
  
  // Actions
  setActiveTool: (tool: Tool) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleRightSidebar: () => void;
  setExportDialog: (show: boolean) => void;
  setAIDialog: (show: boolean) => void;
  setFeedPreviewDialog: (show: boolean) => void;
  setEditingId: (id: string | null) => void;
  startCropEditing: (id: string, mode: CropMode) => void;
  cancelCropEditing: () => void;
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Loading actions
  setGenerating: (generating: boolean) => void;
  setUploading: (uploading: boolean) => void;
  setExporting: (exporting: boolean) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeTool: 'select',
  showGrid: false,
  snapToGrid: true,
  gridSize: 40,
  showLayersPanel: true,
  showPropertiesPanel: true,
  showRightSidebar: true,
  showExportDialog: false,
  showAIDialog: false,
  showFeedPreviewDialog: false,
  toasts: [],
  isGenerating: false,
  isUploading: false,
  isExporting: false,
  editingId: null,
  cropEditingId: null,
  cropEditingMode: null,
  
  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  toggleSnapToGrid: () => {
    set((state) => ({ snapToGrid: !state.snapToGrid }));
  },

  setGridSize: (size) => {
    set({ gridSize: Math.max(4, Math.min(200, Math.round(size))) });
  },
  
  toggleLayersPanel: () => {
    set((state) => ({ showLayersPanel: !state.showLayersPanel }));
  },
  
  togglePropertiesPanel: () => {
    set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel }));
  },
  
  toggleRightSidebar: () => {
    set((state) => ({ showRightSidebar: !state.showRightSidebar }));
  },
  
  setExportDialog: (show) => {
    set({ showExportDialog: show });
  },
  
  setAIDialog: (show) => {
    set({ showAIDialog: show });
  },
  
  setFeedPreviewDialog: (show) => {
    set({ showFeedPreviewDialog: show });
  },
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    // Auto-remove after duration
    const duration = toast.duration || 3000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  setGenerating: (generating) => {
    set({ isGenerating: generating });
  },
  
  setUploading: (uploading) => {
    set({ isUploading: uploading });
  },
  
  setExporting: (exporting) => {
    set({ isExporting: exporting });
  },

  setEditingId: (id) => {
    set({ editingId: id });
  },

  startCropEditing: (id, mode) => {
    set({ cropEditingId: id, cropEditingMode: mode, activeTool: 'select' });
  },

  cancelCropEditing: () => {
    set({ cropEditingId: null, cropEditingMode: null });
  },
}));
