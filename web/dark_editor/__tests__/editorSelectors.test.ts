import { describe, it, expect } from 'vitest';
import { selectCropTarget, selectSingleSelectedObject } from '@/lib/editorSelectors';
import type { CanvasObject } from '@/stores/editorStore';

const makeObject = (id: string, type: CanvasObject['type'] = 'text'): CanvasObject => ({
  id,
  type,
  x: 10,
  y: 20,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  visible: true,
  locked: false,
  name: id,
});

const makeState = (objects: CanvasObject[], selectedIds: string[]) => ({
  objects: Object.fromEntries(objects.map((o) => [o.id, o])),
  selectedIds,
});

describe('selectCropTarget', () => {
  const image = { ...makeObject('img1', 'image'), cropRect: { x: 0, y: 0, width: 1, height: 1 } } as CanvasObject;
  const text = makeObject('txt1', 'text');
  const state = makeState([image, text], []);

  it('returns null when no crop is active', () => {
    expect(selectCropTarget(state, null)).toBeNull();
  });

  it('returns the image object in O(1) when cropEditingId matches an image', () => {
    expect(selectCropTarget(state, 'img1')).toBe(image);
  });

  it('returns null when the matched object is not an image', () => {
    expect(selectCropTarget(state, 'txt1')).toBeNull();
  });

  it('returns null when the id does not exist', () => {
    expect(selectCropTarget(state, 'missing')).toBeNull();
  });
});

describe('selectSingleSelectedObject', () => {
  const obj1 = makeObject('a');
  const obj2 = makeObject('b');

  it('returns null when no object is selected', () => {
    const state = makeState([obj1, obj2], []);
    expect(selectSingleSelectedObject(state)).toBeNull();
  });

  it('returns null when multiple objects are selected', () => {
    const state = makeState([obj1, obj2], ['a', 'b']);
    expect(selectSingleSelectedObject(state)).toBeNull();
  });

  it('returns the single selected object via direct map lookup', () => {
    const state = makeState([obj1, obj2], ['b']);
    expect(selectSingleSelectedObject(state)).toBe(obj2);
  });
});
