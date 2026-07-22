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
  objects: Record<string, CanvasObject>; // O(1) lookup by id
  objectIds: string[]; // layer order
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
  commitMutation: (recipe: (draft: { objects: Record<string, CanvasObject>; objectIds: string[] }) => void) => void;
  commitLiveMutation: (recipe: (draft: { objects: Record<string, CanvasObject>; objectIds: string[] }) => void) => void;

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

// Helper to derive an ordered array from the normalized state
export function getObjectsArrayFromState(
  objects: Record<string, CanvasObject>,
  objectIds: string[]
): CanvasObject[] {
  return objectIds.map((id) => objects[id]).filter((obj): obj is CanvasObject => !!obj);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  objects: {},
  objectIds: [],
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
    const { objects, objectIds, pastPatches, pendingPatches, pendingInversePatches } = get();
    const [nextState, patches, inversePatches] = produceWithPatches({ objects, objectIds }, recipe);

    if (patches.length === 0 && pendingPatches.length === 0) return;

    const finalPatches = [...pendingPatches, ...patches];
    const finalInversePatches = [...inversePatches, ...pendingInversePatches];

    const newPast = [...pastPatches, { patches: finalPatches, inversePatches: finalInversePatches }];
    if (newPast.length > 50) newPast.shift();

    set({
      objects: nextState.objects,
      objectIds: nextState.objectIds,
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  commitLiveMutation: (recipe) => {
    const { objects, objectIds, pendingPatches, pendingInversePatches } = get();
    const [nextState, patches, inversePatches] = produceWithPatches({ objects, objectIds }, recipe);

    if (patches.length === 0) return;

    set({
      objects: nextState.objects,
      objectIds: nextState.objectIds,
      pendingPatches: [...pendingPatches, ...patches],
      pendingInversePatches: [...inversePatches, ...pendingInversePatches],
    });
  },

  // Actions
  addObject: (obj) => {
    get().commitMutation((draft) => {
      draft.objects[obj.id] = obj;
      draft.objectIds.push(obj.id);
    });
  },

  updateObject: (id, updates) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) Object.assign(obj, updates);
    });
  },

  updateObjectLive: (id, updates) => {
    get().commitLiveMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) Object.assign(obj, updates);
    });
  },

  deleteObject: (id) => {
    get().commitMutation((draft) => {
      delete draft.objects[id];
      const index = draft.objectIds.indexOf(id);
      if (index !== -1) draft.objectIds.splice(index, 1);
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
      for (const id of selectedIds) {
        delete draft.objects[id];
      }
      draft.objectIds = draft.objectIds.filter((objId) => !selectedSet.has(objId));
    });
    set({ selectedIds: [] });
  },

  duplicateSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    const newIds: string[] = [];

    get().commitMutation((draft) => {
      for (const id of selectedIds) {
        const o = draft.objects[id];
        if (!o) continue;
        const newId = uuidv4();
        newIds.push(newId);
        draft.objects[newId] = {
          ...o,
          id: newId,
          x: o.x + 20,
          y: o.y + 20,
          name: o.name ? `${o.name} Copy` : 'Copy',
        };
        draft.objectIds.push(newId);
      }
    });
    set({ selectedIds: newIds });
  },

  copySelected: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;

    // Copy the selected objects, decoupling them from the current state
    const copiedObjects = selectedIds
      .map((id) => objects[id])
      .filter((obj): obj is CanvasObject => !!obj)
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
        draft.objects[newId] = {
          ...obj,
          id: newId,
          x: obj.x + 20,
          y: obj.y + 20,
        };
        draft.objectIds.push(newId);
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
    const { objectIds } = get();
    set({ selectedIds: [...objectIds] });
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
    const { pastPatches, futurePatches, objects, objectIds, pendingPatches, pendingInversePatches } = get();
    const currentState = { objects, objectIds };

    if (pendingPatches.length > 0) {
      const nextState = applyPatches(currentState, pendingInversePatches);
      set({
        objects: nextState.objects,
        objectIds: nextState.objectIds,
        pendingPatches: [],
        pendingInversePatches: [],
      });
      return;
    }

    if (pastPatches.length === 0) return;

    const lastEntry = pastPatches[pastPatches.length - 1];
    const prevState = applyPatches(currentState, lastEntry.inversePatches);

    set({
      objects: prevState.objects,
      objectIds: prevState.objectIds,
      pastPatches: pastPatches.slice(0, -1),
      futurePatches: [lastEntry, ...futurePatches],
      selectedIds: [],
    });
  },

  redo: () => {
    const { futurePatches, pastPatches, objects, objectIds, pendingPatches } = get();
    if (futurePatches.length === 0 || pendingPatches.length > 0) return;

    const nextEntry = futurePatches[0];
    const currentState = { objects, objectIds };
    const nextState = applyPatches(currentState, nextEntry.patches);

    set({
      objects: nextState.objects,
      objectIds: nextState.objectIds,
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
    const nextIds = objects.map((obj) => obj.id);
    const nextObjects: Record<string, CanvasObject> = {};
    for (const obj of objects) {
      nextObjects[obj.id] = obj;
    }
    set({
      objects: nextObjects,
      objectIds: nextIds,
      selectedIds: [],
      pastPatches: [],
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  clearCanvas: () => {
    set({
      objects: {},
      objectIds: [],
      selectedIds: [],
      pastPatches: [],
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  moveLayerUp: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index < draft.objectIds.length - 1 && index !== -1) {
        [draft.objectIds[index], draft.objectIds[index + 1]] = [draft.objectIds[index + 1], draft.objectIds[index]];
      }
    });
  },

  moveLayerDown: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index > 0 && index !== -1) {
        [draft.objectIds[index], draft.objectIds[index - 1]] = [draft.objectIds[index - 1], draft.objectIds[index]];
      }
    });
  },

  bringToFront: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index < draft.objectIds.length - 1 && index !== -1) {
        const [objId] = draft.objectIds.splice(index, 1);
        draft.objectIds.push(objId);
      }
    });
  },

  sendToBack: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index > 0 && index !== -1) {
        const [objId] = draft.objectIds.splice(index, 1);
        draft.objectIds.unshift(objId);
      }
    });
  },

  // Filter actions
  applyBlur: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.blur = Math.max(0, Math.min(20, intensity));
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },

  applySharpen: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.sharpen = Math.max(0, Math.min(20, intensity));
        obj.blur = 0;
        obj.pixelation = 0;
      }
    });
  },

  applyPixelation: (id, pixelSize) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
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
      const obj = draft.objects[id];
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
      const obj = draft.objects[id];
      if (obj) obj.textShadow = shadow;
    });
  },

  applyTextStroke: (id, stroke) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textStroke = stroke;
    });
  },

  applyTextGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textGradient = gradient;
    });
  },

  applyTextCurve: (id, curve) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textCurve = curve;
    });
  },

  clearTextEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
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
      const obj = draft.objects[id];
      if (obj) obj.dropShadow = shadow;
    });
  },

  applyBorderRadius: (id, radius) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.borderRadius = Math.max(0, radius);
    });
  },

  applyShapeGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.shapeGradient = gradient;
    });
  },

  applyTexture: (id, texture) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.texture = texture;
    });
  },

  clearShapeEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
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
    const obj = objects[id];
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
