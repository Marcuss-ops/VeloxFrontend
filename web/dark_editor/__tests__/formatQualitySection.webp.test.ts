import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FORMAT_SECTION_PATH = path.resolve(
  __dirname,
  '../components/editor/export/FormatQualitySection.tsx',
);

describe('FormatQualitySection export policy', () => {
  it('keeps PNG fixed without format or quality controls', () => {
    const source = fs.readFileSync(FORMAT_SECTION_PATH, 'utf8');

    expect(source).toMatch(/PNG senza perdita/);
    expect(source).not.toMatch(/WebP|JPEG|quality|Qualità|<Select|<Slider/);
  });
});
