import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// The old FormatQualitySection component (dead since the ExportDialog
// composition refactor) pinned this policy; the live publish panel renders
// the same "Formato fisso / PNG" card inline in PublishExportDialog, so the
// policy is now read from the live surface it applies to.
const LIVE_PUBLISH_PANEL_PATH = path.resolve(
  __dirname,
  '../components/editor/export/PublishExportDialog.tsx',
);

describe('Publish panel format policy', () => {
  it('keeps PNG fixed without format or quality controls', () => {
    const source = fs.readFileSync(LIVE_PUBLISH_PANEL_PATH, 'utf8');

    expect(source).toMatch(/PNG/);
    expect(source).toMatch(/senza perdita/);
    expect(source).not.toMatch(/WebP|JPEG|quality|Qualità|<Select|<Slider/);
  });
});
