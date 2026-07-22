import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as presetsStore from '@/lib/presets-store';
import type { StoredPreset } from '@/lib/presets-store';

const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  },
}));

const makePreset = (name: string, type: 'complete' | 'text'): StoredPreset => ({
  id: `id-${name}`,
  name,
  type,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

describe('presets-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('[]');
  });

  it('lists presets', () => {
    const preset = makePreset('P1', 'complete');
    mockReadFileSync.mockReturnValue(JSON.stringify([preset]));
    expect(presetsStore.listPresets()).toHaveLength(1);
  });

  it('gets a preset by id', () => {
    const preset = makePreset('P1', 'complete');
    mockReadFileSync.mockReturnValue(JSON.stringify([preset]));
    expect(presetsStore.getPreset('id-P1')).toEqual(preset);
  });

  it('creates a preset', () => {
    mockExistsSync.mockReturnValueOnce(false);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const result = presetsStore.createPreset({ name: 'New', type: 'text' });
    expect(result.name).toBe('New');
    expect(result.type).toBe('text');
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('updates a preset', () => {
    const preset = makePreset('P1', 'complete');
    mockReadFileSync.mockReturnValue(JSON.stringify([preset]));
    const updated = presetsStore.updatePreset('id-P1', { name: 'Renamed' });
    expect(updated?.name).toBe('Renamed');
  });

  it('deletes a preset', () => {
    const preset = makePreset('P1', 'complete');
    mockReadFileSync.mockReturnValue(JSON.stringify([preset]));
    expect(presetsStore.deletePreset('id-P1')).toBe(true);
    expect(presetsStore.deletePreset('missing')).toBe(false);
  });
});
