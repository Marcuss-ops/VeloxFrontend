import { describe, it, expect } from 'vitest';
import { getObjectsArrayFromState } from '@/stores/editorStore';
import type { CanvasObject } from '@/stores/editorStore';

const makeObject = (id: string): CanvasObject => ({
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
});

describe('getObjectsArrayFromState', () => {
  it('returns an empty array for empty state', () => {
    expect(getObjectsArrayFromState({}, [])).toEqual([]);
  });

  it('returns objects in the order defined by objectIds', () => {
    const a = makeObject('a');
    const b = makeObject('b');
    const objects = { a, b };
    expect(getObjectsArrayFromState(objects, ['b', 'a'])).toEqual([b, a]);
  });

  it('skips ids that do not exist in the objects map', () => {
    const a = makeObject('a');
    expect(getObjectsArrayFromState({ a }, ['a', 'missing'])).toEqual([a]);
  });
});
