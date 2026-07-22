import { describe, it, expect } from 'vitest';
import { buildSelectedIdSet, findEditingObject } from '@/lib/canvasSelection';
import type { CanvasObject } from '@/stores/editorStore';

const makeObject = (id: string, type: CanvasObject['type'] = 'text'): CanvasObject => ({
  id,
  type,
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
  it('returns an empty set when no ids are selected', () => {
    const set = buildSelectedIdSet([]);
    expect(set.has('1')).toBe(false);
    expect(set.size).toBe(0);
  });

  it('contains every selected id with O(1) lookup', () => {
    const ids = ['a', 'b', 'c'];
    const set = buildSelectedIdSet(ids);
    ids.forEach((id) => expect(set.has(id)).toBe(true));
    expect(set.has('d')).toBe(false);
  });

  it('ignores duplicates in the input array', () => {
    const set = buildSelectedIdSet(['x', 'x', 'y']);
    expect(set.size).toBe(2);
    expect(set.has('x')).toBe(true);
    expect(set.has('y')).toBe(true);
  });
});

describe('findEditingObject', () => {
  const objects = [makeObject('t1', 'text'), makeObject('i1', 'image'), makeObject('t2', 'text')];

  it('returns null when no object is being edited', () => {
    expect(findEditingObject(objects, null)).toBeNull();
  });

  it('finds the matching object by id', () => {
    const result = findEditingObject(objects, 'i1');
    expect(result).toBeDefined();
    expect(result?.id).toBe('i1');
    expect(result?.type).toBe('image');
  });

  it('returns null when the id does not exist', () => {
    expect(findEditingObject(objects, 'missing')).toBeNull();
  });
});
