import { describe, it, expect } from 'vitest';
import { buildSelectedIdSet, findEditingObject } from '@/lib/canvasSelection';
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

describe('buildSelectedIdSet', () => {
  it('returns an empty set for no selected ids', () => {
    expect(buildSelectedIdSet([])).toEqual(new Set());
  });

  it('builds a set for O(1) selected lookup', () => {
    const set = buildSelectedIdSet(['a', 'b']);
    expect(set.has('a')).toBe(true);
    expect(set.has('c')).toBe(false);
  });
});

describe('findEditingObject', () => {
  const obj1 = makeObject('a');
  const obj2 = makeObject('b');

  it('returns null when editing id is null', () => {
    expect(findEditingObject([obj1, obj2], null)).toBeNull();
  });

  it('finds the object by id', () => {
    expect(findEditingObject([obj1, obj2], 'b')).toBe(obj2);
  });

  it('returns null when the id is not found', () => {
    expect(findEditingObject([obj1, obj2], 'c')).toBeNull();
  });
});
