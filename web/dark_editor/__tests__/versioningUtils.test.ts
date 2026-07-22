import { describe, it, expect } from 'vitest';
import { buildVersionsByIdMap } from '@/lib/versioningUtils';
import type { Version } from '@/stores/versioningStore';

const makeVersion = (id: string, name: string): Version => ({
  id,
  name,
  projectId: 'project-1',
  timestamp: Date.now(),
  objects: [],
});

describe('buildVersionsByIdMap', () => {
  it('returns an empty map for an empty array', () => {
    expect(buildVersionsByIdMap([])).toEqual({});
  });

  it('maps each version id to its object for O(1) lookup', () => {
    const v1 = makeVersion('v1', 'Version 1');
    const v2 = makeVersion('v2', 'Version 2');
    const map = buildVersionsByIdMap([v1, v2]);

    expect(map.v1).toBe(v1);
    expect(map.v2).toBe(v2);
  });

  it('overrides earlier entries when duplicate ids are present', () => {
    const first = makeVersion('v1', 'First');
    const second = makeVersion('v1', 'Second');
    const map = buildVersionsByIdMap([first, second]);

    expect(map.v1).toBe(second);
  });
});
