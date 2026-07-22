import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as folders from '@/lib/folders';
import type { Folder } from '@/lib/folders';

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

describe('folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('[]');
  });

  it('lists folders', () => {
    expect(folders.listFolders()).toEqual([]);
  });

  it('creates a folder', () => {
    mockExistsSync.mockReturnValueOnce(false);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const folder = folders.createFolder('My Folder');
    expect(folder.name).toBe('My Folder');
    expect(folder.parent_id).toBeNull();
  });

  it('creates a nested folder', () => {
    mockExistsSync.mockReturnValueOnce(false);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const folder = folders.createFolder('Child', 'parent-1');
    expect(folder.parent_id).toBe('parent-1');
  });

  it('updates a folder', () => {
    const folder: Folder = { id: 'f1', name: 'Old', parent_id: null, created_at: '2024-01-01' };
    mockReadFileSync.mockReturnValue(JSON.stringify([folder]));
    const updated = folders.updateFolder('f1', { name: 'New' });
    expect(updated?.name).toBe('New');
  });

  it('deletes a folder', () => {
    const folder: Folder = { id: 'f1', name: 'Folder', parent_id: null, created_at: '2024-01-01' };
    mockReadFileSync.mockReturnValue(JSON.stringify([folder]));
    expect(folders.deleteFolder('f1')).toBe(true);
    expect(folders.deleteFolder('missing')).toBe(false);
  });

  it('gets a folder by id', () => {
    const folder: Folder = { id: 'f1', name: 'Folder', parent_id: null, created_at: '2024-01-01' };
    mockReadFileSync.mockReturnValue(JSON.stringify([folder]));
    expect(folders.getFolder('f1')).toEqual(folder);
  });
});
