import { create } from 'zustand';
import { CanvasObject } from './editorStore';

export interface Preset {
  id: string;
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: CanvasObject[]; // For complete presets
  textObjects?: CanvasObject[]; // For text presets
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PresetState {
  // Presets data
  presets: Preset[];
  selectedPresetId: string | null;
  isLoading: boolean;
  
  // Actions
  setPresets: (presets: Preset[]) => void;
  setSelectedPreset: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // CRUD operations
  createPreset: (preset: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Preset>;
  updatePreset: (id: string, updates: Partial<Preset>) => Promise<Preset>;
  deletePreset: (id: string) => Promise<boolean>;
  loadPresets: () => Promise<Preset[]>;
  
  // Preset application
  applyPreset: (id: string) => Promise<void>;
  applyTextPreset: (id: string) => Promise<void>;
  
  // Search and filter
  searchPresets: (query: string) => Preset[];
  filterPresets: (type: 'complete' | 'text' | 'all') => Preset[];
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  selectedPresetId: null,
  isLoading: false,
  
  setPresets: (presets) => set({ presets }),
  setSelectedPreset: (id) => set({ selectedPresetId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  createPreset: async (presetData) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/dark_editor_v2/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create preset');
      }
      
      const newPreset = await response.json();
      set((state) => ({
        presets: [...state.presets, newPreset],
        isLoading: false,
      }));
      
      return newPreset;
    } catch (error) {
      console.error('Error creating preset:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  updatePreset: async (id, updates) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/dark_editor_v2/api/presets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preset');
      }
      
      const updatedPreset = await response.json();
      set((state) => ({
        presets: state.presets.map((p) => (p.id === id ? updatedPreset : p)),
        isLoading: false,
      }));
      
      return updatedPreset;
    } catch (error) {
      console.error('Error updating preset:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  deletePreset: async (id) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/dark_editor_v2/api/presets/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete preset');
      }
      
      set((state) => ({
        presets: state.presets.filter((p) => p.id !== id),
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      console.error('Error deleting preset:', error);
      set({ isLoading: false });
      return false;
    }
  },
  
  loadPresets: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/dark_editor_v2/api/presets');
      
      if (!response.ok) {
        throw new Error('Failed to load presets');
      }
      
      const presets = await response.json();
      set({ presets, isLoading: false });
      return presets;
    } catch (error) {
      console.error('Error loading presets:', error);
      set({ isLoading: false });
      return [];
    }
  },
  
  applyPreset: async (id) => {
    const { presets } = get();
    const preset = presets.find((p) => p.id === id);
    
    if (!preset || preset.type !== 'complete' || !preset.objects) {
      throw new Error('Invalid preset or preset type');
    }
    
    // This would need to integrate with the editor store
    // For now, we'll just set the selected preset
    set({ selectedPresetId: id });
    
    // TODO: Dispatch action to editor store to load objects
    console.log('Applying complete preset:', preset);
  },
  
  applyTextPreset: async (id) => {
    const { presets } = get();
    const preset = presets.find((p) => p.id === id);
    
    if (!preset || preset.type !== 'text' || !preset.textObjects) {
      throw new Error('Invalid text preset');
    }
    
    // This would need to integrate with the editor store
    // For now, we'll just set the selected preset
    set({ selectedPresetId: id });
    
    // TODO: Dispatch action to editor store to add text objects
    console.log('Applying text preset:', preset);
  },
  
  searchPresets: (query) => {
    const { presets } = get();
    if (!query.trim()) return presets;
    
    const lowerQuery = query.toLowerCase();
    return presets.filter((preset) =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      (preset.description && preset.description.toLowerCase().includes(lowerQuery))
    );
  },
  
  filterPresets: (type) => {
    const { presets } = get();
    if (type === 'all') return presets;
    return presets.filter((preset) => preset.type === type);
  },
}));