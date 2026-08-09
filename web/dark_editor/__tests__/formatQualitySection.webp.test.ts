import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FORMAT_SECTION_PATH = path.resolve(
  __dirname,
  '../components/editor/export/FormatQualitySection.tsx',
);

describe('FormatQualitySection local-export formats', () => {
  it('offers WebP for local export while publish handoff remains PNG/JPG', () => {
    const source = fs.readFileSync(FORMAT_SECTION_PATH, 'utf8');

    // WebP is valid for local downloads. The direct InstaEdit handoff still
    // normalizes variants to PNG before calling /media/presign.
    expect(source).toMatch(/value:\s*[\'"]webp[\'"]/);
    expect(source).toMatch(/WebP - Compressed/);
  });
});
