import { describe, expect, it } from 'vitest';
import { isScopedProjectId } from '@/lib/project-scope';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

// The former lib/editor-ownership.ts delegation (isScopedEditorProjectId /
// isRetiredYouTubeCatalogPath) was removed with the local projects catalog
// (bd1ff37): authorization for ve_/vx_ documents lives in the InstaEdit BFF
// and the retired YouTube catalog paths are pinned inline by the proxy
// route. This suite keeps the boundary contract against the survivors.

describe('InstaEdit/Velox project bridge boundary', () => {
  it('accepts only opaque ve_/vx_ project handles (single canonical resolver)', () => {
    expect(isScopedProjectId('ve_project_123')).toBe(true);
    expect(isScopedProjectId('vx_project_123')).toBe(true);
    // Non-scoped ids must NEVER be treated as InstaEdit-backed projects:
    // a vx_/ve_ check here is the exact contract mismatch that used to let
    // a vx_ handle through authorization into the legacy persistence.
    expect(isScopedProjectId('project_123')).toBe(false);
    expect(isScopedProjectId('ve_')).toBe(false);
    expect(isScopedProjectId('vx_')).toBe(false);
    expect(isScopedProjectId('')).toBe(false);
  });

  it('retires every global YouTube catalog path in the proxy route', () => {
    const youtubeRoute = read('app/api/v1/youtube/[...path]/route.ts');
    for (const prefix of ['/groups', '/channels', '/feed', '/group-videos', '/group-private-videos', '/videos']) {
      expect(youtubeRoute).toContain(`'${prefix}'`);
    }
  });

  it('keeps the bridge minimal and one-way in the API surface', () => {
    // The per-id local catalog route is gone: the project-scoped BFF owns
    // ve_/vx_ documents and there is no second project persistence.
    const catalogRoute = read('app/api/projects/route.ts');
    const youtubeRoute = read('app/api/v1/youtube/[...path]/route.ts');

    expect(catalogRoute).toContain('status: 410');
    expect(catalogRoute).toContain("owner: 'instaedit'");
    expect(youtubeRoute).toContain('velox_youtube_catalog_removed');
    expect(youtubeRoute).toContain("owner: 'instaedit'");
    expect(youtubeRoute.toLowerCase()).not.toContain('sync_groups');
    expect(youtubeRoute.toLowerCase()).not.toContain('sync_channels');
  });
});
