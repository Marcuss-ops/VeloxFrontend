import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '@/stores/editorStore';
import type { CanvasObject } from '@/stores/editorStore';

const makeObject = (id: string, overrides: Partial<CanvasObject> = {}): CanvasObject => ({
  id,
  type: 'text',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  visible: true,
  locked: false,
  name: id,
  ...overrides,
});

describe('editorStore composition (slices registry)', () => {
  beforeEach(() => {
    useEditorStore.getState().clearCanvas();
  });

  it('exposes the state and actions merged from every slice', () => {
    const state = useEditorStore.getState();

    // objectSlice — normalized: objects is a Record (O(1) by id) and
    // objectIds holds the layer order.
    expect(state.objects).toEqual({});
    expect(Array.isArray(state.objectIds)).toBe(true);
    expect(Array.isArray(state.selectedIds)).toBe(true);
    expect(Array.isArray(state.clipboard)).toBe(true);
    expect(typeof state.addObject).toBe('function');
    expect(typeof state.updateObject).toBe('function');
    expect(typeof state.updateObjectLive).toBe('function');
    expect(typeof state.deleteObject).toBe('function');
    expect(typeof state.duplicateSelected).toBe('function');
    expect(typeof state.copySelected).toBe('function');
    expect(typeof state.pasteClipboard).toBe('function');
    expect(typeof state.selectObject).toBe('function');
    expect(typeof state.loadObjects).toBe('function');
    expect(typeof state.clearCanvas).toBe('function');
    expect(typeof state.moveLayerUp).toBe('function');
    expect(typeof state.sendToBack).toBe('function');

    // historySlice
    expect(Array.isArray(state.pastPatches)).toBe(true);
    expect(Array.isArray(state.futurePatches)).toBe(true);
    expect(typeof state.commitMutation).toBe('function');
    expect(typeof state.commitLiveMutation).toBe('function');
    expect(typeof state.undo).toBe('function');
    expect(typeof state.redo).toBe('function');
    expect(typeof state.saveToHistory).toBe('function');

    // effectsSlice
    expect(typeof state.applyBlur).toBe('function');
    expect(typeof state.applySharpen).toBe('function');
    expect(typeof state.applyPixelation).toBe('function');
    expect(typeof state.applyAllFilters).toBe('function');
    expect(typeof state.applyTextShadow).toBe('function');
    expect(typeof state.applyTextStroke).toBe('function');
    expect(typeof state.applyTextGradient).toBe('function');
    expect(typeof state.applyTextCurve).toBe('function');
    expect(typeof state.applyDropShadow).toBe('function');
    expect(typeof state.applyBorderRadius).toBe('function');
    expect(typeof state.applyShapeGradient).toBe('function');
    expect(typeof state.applyTexture).toBe('function');
    expect(typeof state.clearShapeEffects).toBe('function');

    // canvas view state kept in the registry
    expect(state.canvasWidth).toBe(1920);
    expect(state.canvasHeight).toBe(1080);
    expect(typeof state.setCanvasSize).toBe('function');
    expect(typeof state.setZoom).toBe('function');
    expect(typeof state.setOffset).toBe('function');

    // domain purity: the network-coupled AI action moved out of the store
    expect('removeBackground' in state).toBe(false);
  });

  it('addObject is undoable and redoable', () => {
    const store = useEditorStore;
    store.getState().addObject(makeObject('a'));
    expect(store.getState().objectIds).toEqual(['a']);
    expect(store.getState().objects['a'].id).toBe('a');

    store.getState().undo();
    expect(store.getState().objectIds).toHaveLength(0);
    expect(store.getState().objects).toEqual({});

    store.getState().redo();
    expect(store.getState().objectIds).toEqual(['a']);
    expect(store.getState().objects['a'].id).toBe('a');
  });

  it('live mutations buffer into history and commit via saveToHistory', () => {
    const store = useEditorStore;
    store.getState().addObject(makeObject('a', { x: 10 }));
    store.getState().updateObjectLive('a', { x: 50 });

    expect(store.getState().objects['a'].x).toBe(50);
    expect(store.getState().pendingPatches.length).toBeGreaterThan(0);

    store.getState().saveToHistory();
    expect(store.getState().pendingPatches).toHaveLength(0);
    expect(store.getState().pastPatches.length).toBeGreaterThan(0);
  });

  it('effects mutate the target object through history', () => {
    const store = useEditorStore;
    store.getState().addObject(makeObject('a'));
    store.getState().applyBlur('a', 10);
    store.getState().applyTextShadow('a', { offsetX: 2, offsetY: 2, blur: 4, color: '#000' });
    store.getState().applyDropShadow('a', { offsetX: 1, offsetY: 1, blur: 2, spread: 0, color: '#000' });

    const object = store.getState().objects['a'];
    expect(object.blur).toBe(10);
    expect(object.textShadow?.blur).toBe(4);
    expect(object.dropShadow?.offsetX).toBe(1);
    expect(store.getState().pastPatches.length).toBeGreaterThan(0);
  });

  it('loadObjects resets history and selection', () => {
    const store = useEditorStore;
    store.getState().addObject(makeObject('a'));
    store.getState().selectObject('a');

    store.getState().loadObjects([makeObject('b')]);
    expect(store.getState().objectIds).toEqual(['b']);
    expect(store.getState().objects['b'].id).toBe('b');
    expect(store.getState().selectedIds).toHaveLength(0);
    expect(store.getState().pastPatches).toHaveLength(0);
  });

  it('copySelected copies only the selected objects (O(1) Record lookup)', () => {
    const store = useEditorStore;
    store.getState().addObject(makeObject('a'));
    store.getState().addObject(makeObject('b'));
    store.getState().addObject(makeObject('c'));
    store.getState().selectObject('a', true);
    store.getState().selectObject('c', true);

    store.getState().copySelected();

    expect(store.getState().clipboard.map((o) => o.id).sort()).toEqual(['a', 'c']);
    // The copied objects are decoupled from live state.
    expect(store.getState().clipboard[0]).not.toBe(store.getState().objects['a']);
    expect(store.getState().clipboard[1]).not.toBe(store.getState().objects['c']);
    // The canvas is untouched by a copy.
    expect(store.getState().objectIds).toEqual(['a', 'b', 'c']);
  });
});
