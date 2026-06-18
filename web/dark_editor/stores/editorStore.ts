import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { produceWithPatches, applyPatches, Patch, enablePatches } from 'immer';

enablePatches();

export type CanvasObject = {
  id: string;
  type: 'image' | 'text' | 'rect' | 'circle' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  name: string;
  // Type-specific properties
  src?: string; // for images
  text?: string; // for text
  fill?: string; // for shapes
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  fontWeight?: string;
  allCaps?: boolean;
  backgroundFill?: string;
  backgroundOpacity?: number;
  padding?: number;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
  // NEW: Censorship & Translation
  censoredText?: string; // Censored version of text
  useCensorship?: boolean; // Toggle censorship on/off
  // NEW: Focus/Defocus & Pixelation
  blur?: number; // Blur intensity (0 = no effect)
  sharpen?: number; // Sharpen intensity (0 = no effect)
  pixelation?: number; // Pixel size (0 = no effect)
  
  // NEW: Advanced Text Effects
  textShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textStroke?: {
    width: number;
    color: string;
  };
  textGradient?: {
    type: 'linear' | 'radial';
    angle: number;
    colors: string[];
  };
  textCurve?: {
    enabled: boolean;
    radius: number;
    direction: 'up' | 'down';
  };
  
  // NEW: Shape & Image Effects
  dropShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
  };
  borderRadius?: number;
  shapeGradient?: {
    type: 'linear' | 'radial';
    angle: number;
    colors: string[];
  };
  texture?: {
    type: 'none' | 'noise' | 'grain' | 'paper' | 'metal';
    intensity: number;
  };
  // NEW: Image Fills for Clipping Masks
  imageFill?: {
    src: string;
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  cropMode?: 'free' | 'square' | 'circle' | 'lasso';
  cropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cropPathPoints?: number[];
  feather?: number;
  processing?: boolean; // NEW: Processing state for AI actions
};

export interface EditorState {
  // Canvas state
  objects: CanvasObject[];
  selectedIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  
  // History for undo/redo
  pastPatches: { patches: Patch[]; inversePatches: Patch[] }[];
  futurePatches: { patches: Patch[]; inversePatches: Patch[] }[];
  pendingPatches: Patch[];
  pendingInversePatches: Patch[];
  
  // Clipboard
  clipboard: CanvasObject[];
  
  // Actions
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  selectObject: (id: string | null, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Canvas actions
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  commitMutation: (recipe: (draft: CanvasObject[]) => void) => void;
  commitLiveMutation: (recipe: (draft: CanvasObject[]) => void) => void;
  
  // Bulk actions
  loadObjects: (objects: CanvasObject[]) => void;
  clearCanvas: () => void;
  
  // Layer actions
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Filter actions
  applyBlur: (id: string, intensity: number) => void;
  applySharpen: (id: string, intensity: number) => void;
  applyPixelation: (id: string, pixelSize: number) => void;
  applyAllFilters: (id: string, filters: { blur?: number, sharpen?: number, pixelation?: number }) => void;
  clearFilters: (id: string) => void;
  
  // Advanced text effects actions
  applyTextShadow: (id: string, shadow: CanvasObject['textShadow']) => void;
  applyTextStroke: (id: string, stroke: CanvasObject['textStroke']) => void;
  applyTextGradient: (id: string, gradient: CanvasObject['textGradient']) => void;
  applyTextCurve: (id: string, curve: CanvasObject['textCurve']) => void;
  clearTextEffects: (id: string) => void;
  
  // Shape & image effects actions
  applyDropShadow: (id: string, shadow: CanvasObject['dropShadow']) => void;
  applyBorderRadius: (id: string, radius: number) => void;
  applyShapeGradient: (id: string, gradient: CanvasObject['shapeGradient']) => void;
  applyTexture: (id: string, texture: CanvasObject['texture']) => void;
  clearShapeEffects: (id: string) => void;
  
  // AI Actions
  removeBackground: (id: string) => Promise<void>;
  
  // Custom additions
  updateObjectLive: (id: string, updates: Partial<CanvasObject>) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  objects: [],
  selectedIds: [],
  canvasWidth: 1920,
  canvasHeight: 1080,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  pastPatches: [],
  futurePatches: [],
  pendingPatches: [],
  pendingInversePatches: [],
  clipboard: [],
  
  // Helpers
  commitMutation: (recipe) => {
    const { objects, pastPatches, pendingPatches, pendingInversePatches } = get();
    const [nextObjects, patches, inversePatches] = produceWithPatches(objects, recipe);
    
    if (patches.length === 0 && pendingPatches.length === 0) return;
    
    const finalPatches = [...pendingPatches, ...patches];
    const finalInversePatches = [...inversePatches, ...pendingInversePatches];
    
    const newPast = [...pastPatches, { patches: finalPatches, inversePatches: finalInversePatches }];
    if (newPast.length > 50) newPast.shift();
    
    set({
      objects: nextObjects,
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  commitLiveMutation: (recipe) => {
    const { objects, pendingPatches, pendingInversePatches } = get();
    const [nextObjects, patches, inversePatches] = produceWithPatches(objects, recipe);
    
    if (patches.length === 0) return;
    
    set({
      objects: nextObjects,
      pendingPatches: [...pendingPatches, ...patches],
      pendingInversePatches: [...inversePatches, ...pendingInversePatches],
    });
  },

  // Actions
  addObject: (obj) => {
    get().commitMutation((draft) => {
      draft.push(obj);
    });
  },
  
  updateObject: (id, updates) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) Object.assign(obj, updates);
    });
  },

  updateObjectLive: (id, updates) => {
    get().commitLiveMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) Object.assign(obj, updates);
    });
  },
  
  deleteObject: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex(o => o.id === id);
      if (index !== -1) draft.splice(index, 1);
    });
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
    }
  },
  
  deleteSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    get().commitMutation((draft) => {
      const selectedSet = new Set(selectedIds);
      for (let i = draft.length - 1; i >= 0; i--) {
        if (selectedSet.has(draft[i].id)) {
          draft.splice(i, 1);
        }
      }
    });
    set({ selectedIds: [] });
  },

  duplicateSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    const newIds: string[] = [];
    
    get().commitMutation((draft) => {
      const selectedSet = new Set(selectedIds);
      const toDuplicate = draft.filter((o) => selectedSet.has(o.id));
      for (const o of toDuplicate) {
        const newId = uuidv4();
        newIds.push(newId);
        draft.push({
          ...o,
          id: newId,
          x: o.x + 20,
          y: o.y + 20,
          name: o.name ? `${o.name} Copy` : 'Copy',
        });
      }
    });
    set({ selectedIds: newIds });
  },
  
  copySelected: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;
    
    // Copy the selected objects, decoupling them from the current state
    const copiedObjects = objects
      .filter((obj) => selectedIds.includes(obj.id))
      .map((obj) => JSON.parse(JSON.stringify(obj)));
      
    set({ clipboard: copiedObjects });
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;
    
    const newIds: string[] = [];
    get().commitMutation((draft) => {
      for (const obj of clipboard) {
        const newId = uuidv4();
        newIds.push(newId);
        draft.push({
          ...obj,
          id: newId,
          x: obj.x + 20,
          y: obj.y + 20,
        });
      }
    });

    set({ selectedIds: newIds });
  },

  selectObject: (id, addToSelection = false) => {
    const { selectedIds } = get();
    if (id === null) {
      set({ selectedIds: [] });
    } else if (addToSelection) {
      if (selectedIds.includes(id)) {
        set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
      } else {
        set({ selectedIds: [...selectedIds, id] });
      }
    } else {
      set({ selectedIds: [id] });
    }
  },
  
  selectAll: () => {
    const { objects } = get();
    set({ selectedIds: objects.map((obj) => obj.id) });
  },
  
  clearSelection: () => {
    set({ selectedIds: [] });
  },
  
  setCanvasSize: (width, height) => {
    set({ canvasWidth: width, canvasHeight: height });
  },
  
  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },
  
  setOffset: (x, y) => {
    set({ offsetX: x, offsetY: y });
  },
  
  undo: () => {
    const { pastPatches, futurePatches, objects, pendingPatches, pendingInversePatches } = get();
    let currentObjects = objects;

    if (pendingPatches.length > 0) {
       currentObjects = applyPatches(currentObjects, pendingInversePatches);
       set({ objects: currentObjects, pendingPatches: [], pendingInversePatches: [] });
       return;
    }

    if (pastPatches.length === 0) return;
    
    const lastEntry = pastPatches[pastPatches.length - 1];
    const prevObjects = applyPatches(currentObjects, lastEntry.inversePatches);
    
    set({
      objects: prevObjects,
      pastPatches: pastPatches.slice(0, -1),
      futurePatches: [lastEntry, ...futurePatches],
      selectedIds: [], 
    });
  },
  
  redo: () => {
    const { futurePatches, pastPatches, objects, pendingPatches } = get();
    if (futurePatches.length === 0 || pendingPatches.length > 0) return;
    
    const nextEntry = futurePatches[0];
    const nextObjects = applyPatches(objects, nextEntry.patches);
    
    set({
      objects: nextObjects,
      pastPatches: [...pastPatches, nextEntry],
      futurePatches: futurePatches.slice(1),
    });
  },
  
  saveToHistory: () => {
    const { pendingPatches, pendingInversePatches, pastPatches } = get();
    if (pendingPatches.length === 0) return;
    const newPast = [...pastPatches, { patches: pendingPatches, inversePatches: pendingInversePatches }];
    if (newPast.length > 50) newPast.shift();
    set({
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },
  
  loadObjects: (objects) => {
    set({ objects, selectedIds: [], pastPatches: [], futurePatches: [], pendingPatches: [], pendingInversePatches: [] });
  },
  
  clearCanvas: () => {
    set({ objects: [], selectedIds: [], pastPatches: [], futurePatches: [], pendingPatches: [], pendingInversePatches: [] });
  },
  
  moveLayerUp: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index < draft.length - 1 && index !== -1) {
        [draft[index], draft[index + 1]] = [draft[index + 1], draft[index]];
      }
    });
  },
  
  moveLayerDown: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index > 0 && index !== -1) {
        [draft[index], draft[index - 1]] = [draft[index - 1], draft[index]];
      }
    });
  },
  
  bringToFront: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index < draft.length - 1 && index !== -1) {
        const [obj] = draft.splice(index, 1);
        draft.push(obj);
      }
    });
  },
  
  sendToBack: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index > 0 && index !== -1) {
        const [obj] = draft.splice(index, 1);
        draft.unshift(obj);
      }
    });
  },
  
  // Filter actions
  // Filter actions
  applyBlur: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.blur = Math.max(0, Math.min(20, intensity));
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },
  
  applySharpen: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.sharpen = Math.max(0, Math.min(20, intensity));
        obj.blur = 0;
        obj.pixelation = 0;
      }
    });
  },
  
  applyPixelation: (id, pixelSize) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.pixelation = Math.max(0, Math.min(50, pixelSize));
        obj.blur = 0;
        obj.sharpen = 0;
      }
    });
  },
  
  applyAllFilters: (id, filters) => {
    const { updateObjectLive } = get();
    updateObjectLive(id, { ...filters });
  },

  clearFilters: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.blur = 0;
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },
  
  // Advanced text effects actions
  applyTextShadow: (id, shadow) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.textShadow = shadow;
    });
  },
  
  applyTextStroke: (id, stroke) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.textStroke = stroke;
    });
  },
  
  applyTextGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.textGradient = gradient;
    });
  },
  
  applyTextCurve: (id, curve) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.textCurve = curve;
    });
  },
  
  clearTextEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.textShadow = undefined;
        obj.textStroke = undefined;
        obj.textGradient = undefined;
        obj.textCurve = undefined;
      }
    });
  },
  
  // Shape & image effects actions
  applyDropShadow: (id, shadow) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.dropShadow = shadow;
    });
  },
  
  applyBorderRadius: (id, radius) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.borderRadius = Math.max(0, radius);
    });
  },
  
  applyShapeGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.shapeGradient = gradient;
    });
  },
  
  applyTexture: (id, texture) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.texture = texture;
    });
  },
  
  clearShapeEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.dropShadow = undefined;
        obj.borderRadius = undefined;
        obj.shapeGradient = undefined;
        obj.texture = undefined;
      }
    });
  },
  
  removeBackground: async (id) => {
    const { objects, updateObject } = get();
    const obj = objects.find((o) => o.id === id);
    if (!obj || obj.type !== 'image' || !obj.src) return;
    
    // Set processing state
    updateObject(id, { processing: true });
    
    try {
      const { removeBackground, extractFilenameFromPath } = await import('@/lib/api');
      const filename = extractFilenameFromPath(obj.src);
      
      const response = await removeBackground({ filename, async: false });
      
      if (response.filename) {
        updateObject(id, { src: response.filename, processing: false });
      } else {
        throw new Error(response.error || 'Failed to remove background');
      }
    } catch (error) {
      console.error('Background removal failed:', error);
      updateObject(id, { processing: false });

      // You could show a toast here if you had a toast store
    }
  },
}));
