import { describe, expect, it } from 'vitest';
import { isRetiredYouTubeCatalogPath, isScopedEditorProjectId } from '@/lib/editor-ownership';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('InstaEdit/Velox project bridge boundary', () => {
  it('accepts only opaque ve_ project handles', () => {
    expect(isScopedEditorProjectId('ve_project_123')).toBe(true);
    expect(isScopedEditorProjectId('project_123')).toBe(false);
    expect(isScopedEditorProjectId('ve_')).toBe(false);
  });

  it('retires every global YouTube catalog path', () => {
    for (const path of ['/groups', '/channels', '/group-videos', '/videos/abc']) {
      expect(isRetiredYouTubeCatalogPath(path)).toBe(true);
    }
    expect(isRetiredYouTubeCatalogPath('/editor/projects/ve_project_123')).toBe(false);
  });

  it('keeps the bridge minimal and one-way in the API surface', () => {
    const bridgeRoute = read('app/api/projects/[id]/route.ts');
    const catalogRoute = read('app/api/projects/route.ts');
    const youtubeRoute = read('app/api/v1/youtube/[...path]/route.ts');

    expect(bridgeRoute).toContain('authorizeEditorProject');
    expect(catalogRoute).toContain('status: 410');
    expect(youtubeRoute).toContain('velox_youtube_catalog_removed');
    expect(youtubeRoute).toContain("owner: 'instaedit'");
    expect(youtubeRoute.toLowerCase()).not.toContain('sync_groups');
    expect(youtubeRoute.toLowerCase()).not.toContain('sync_channels');
  });
});
