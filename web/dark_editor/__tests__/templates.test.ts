import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadTemplates, saveTemplates, addTemplate, deleteTemplate } from '@/lib/templates';

describe('templates', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          storage = {};
        },
        get length() {
          return Object.keys(storage).length;
        },
        key: (index: number) => Object.keys(storage)[index] ?? null,
      } as Storage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const makeTemplate = (id: string): Parameters<typeof addTemplate>[0] => ({
    id,
    name: `Template ${id}`,
    createdAt: new Date().toISOString(),
    canvas: { objects: [], canvasWidth: 100, canvasHeight: 100 },
  });

  it('loadTemplates returns empty array when no templates are stored', () => {
    expect(loadTemplates()).toEqual([]);
  });

  it('saveTemplates persists templates and loadTemplates retrieves them', () => {
    const templates = [makeTemplate('t1'), makeTemplate('t2')];
    saveTemplates(templates);
    expect(loadTemplates()).toEqual(templates);
  });

  it('addTemplate prepends the new template', () => {
    const t1 = makeTemplate('t1');
    const t2 = makeTemplate('t2');
    addTemplate(t1);
    addTemplate(t2);
    expect(loadTemplates()[0]).toEqual(t2);
  });

  it('deleteTemplate removes the template by id', () => {
    const t1 = makeTemplate('t1');
    const t2 = makeTemplate('t2');
    saveTemplates([t1, t2]);
    deleteTemplate('t1');
    expect(loadTemplates()).toEqual([t2]);
  });
});
