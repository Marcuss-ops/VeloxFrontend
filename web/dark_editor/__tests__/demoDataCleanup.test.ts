import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('demo data cleanup', () => {
  it('does not ship Amish or competitor demo content in the feed preview', () => {
    const dialog = read('components/editor/FeedPreviewDialog.tsx');
    expect(dialog.toLowerCase()).not.toContain('amish');
    expect(dialog).not.toContain('mockCompetitors');
    expect(existsSync(join(ROOT, 'components/editor/FeedPreview/mockData.ts'))).toBe(false);
  });

  it('no longer ships a local projects.json store (SSOT is the InstaEdit BFF)', () => {
    // The file-backed project catalog was removed: a second owner of
    // project data must not come back.
    expect(existsSync(join(ROOT, 'data/projects.json'))).toBe(false);
    expect(existsSync(join(ROOT, 'lib/projects-store.ts'))).toBe(false);
  });

  it('uses the reversible quarantine utility for known demo fingerprints only', () => {
    const script = read('../../scripts/quarantine-dark-editor-demo-projects.sh');

    expect(script).toContain('--apply');
    expect(script).toContain("const sourceSha256 = crypto.createHash('sha256')");
    expect(script).toContain('mkdir "$LOCK_DIR"');
    expect(script).toContain('fs.renameSync(tmpFile, dataFile);');
    expect(script).toContain('QUARANTINE_FILE');
    expect(script).toContain("project.velox_project_id || project.instaedit_project_id");
    expect(script).toContain("project.canvas_json.bar === 2");
    expect(script).toContain("project.canvas_json.foo === 1");
    expect(script).toContain('const survivors = records.filter((project) => !isKnownDemo(project));');
  });

  it('does not weaken ownership protection for real editor projects', () => {
    // The per-id local route is gone (the BFF owns scoped projects); the
    // retired global catalog still rejects with a clear owner signal.
    const catalogRoute = read('app/api/projects/route.ts');

    expect(catalogRoute).toContain("status: 410");
    expect(catalogRoute).toContain("owner: 'instaedit'");
    expect(existsSync(join(ROOT, 'app/api/projects/[id]/route.ts'))).toBe(false);
  });
});
