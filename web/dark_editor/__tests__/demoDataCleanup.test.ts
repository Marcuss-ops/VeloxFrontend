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

  it('keeps the local project seed empty', () => {
    expect(JSON.parse(read('data/projects.json'))).toEqual([]);
  });

  it('uses the reversible quarantine utility for known demo fingerprints only', () => {
    const script = read('../../scripts/quarantine-dark-editor-demo-projects.sh');

    expect(script).toContain('cp --preserve=mode,timestamps');
    expect(script).toContain('QUARANTINE_FILE');
    expect(script).toContain("project.velox_project_id || project.instaedit_project_id");
    expect(script).toContain("project.canvas_json.bar === 2");
    expect(script).toContain("project.canvas_json.foo === 1");
    expect(script).toContain('const survivors = records.filter((project) => !isKnownDemo(project));');
  });

  it('does not weaken ownership protection for real editor projects', () => {
    const projectRoute = read('app/api/projects/[id]/route.ts');
    const catalogRoute = read('app/api/projects/route.ts');

    expect(projectRoute).toContain('authorizeEditorProject');
    expect(projectRoute).toContain('if (denied) return denied;');
    expect(catalogRoute).toContain("status: 410");
    expect(catalogRoute).toContain("owner: 'instaedit'");
  });
});
