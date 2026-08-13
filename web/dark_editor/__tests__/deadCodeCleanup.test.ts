import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

// Modules removed as dead code. These guards keep them gone: the files must
// not exist and no production source may reference them again without a
// deliberate decision to revive them.
const REMOVED_FILES = [
  'components/ui/ProjectFolders.tsx',
  'components/editor/CanvasObjectNode.tsx',
];

const REMOVED_IDENTIFIERS = ['ProjectFolders', 'CanvasObjectNode'];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('dead code removal guard', () => {
  it('no longer ships ProjectFolders or CanvasObjectNode', () => {
    for (const file of REMOVED_FILES) {
      expect(existsSync(join(ROOT, file))).toBe(false);
    }
  });

  it('does not reference the removed modules from production source', () => {
    const roots = ['components', 'app', 'hooks', 'lib', 'stores'].map((r) =>
      join(ROOT, r)
    );
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of walk(root)) {
        const content = readFileSync(file, 'utf8');
        for (const id of REMOVED_IDENTIFIERS) {
          if (content.includes(id)) {
            offenders.push(`${relative(ROOT, file)} -> ${id}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
