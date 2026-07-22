import type { Version } from '@/stores/versioningStore';

export function buildVersionsByIdMap(versions: Version[]): Record<string, Version> {
  const map: Record<string, Version> = {};
  for (const v of versions) {
    map[v.id] = v;
  }
  return map;
}
