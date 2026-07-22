import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateFilename,
  getTempFileUrl,
  getNvidiaApiKey,
  deleteTempFile,
  getTempFile,
  saveToTemp,
  ensureDirectories,
} from '@/lib/server-utils';
import fs from 'fs';
import path from 'path';

const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockUnlinkSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  },
}));

describe('server-utils', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalApiKey = process.env.NVIDIA_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.NVIDIA_API_KEY;
    } else {
      process.env.NVIDIA_API_KEY = originalApiKey;
    }
  });

  it('generateFilename includes a timestamp and random hex', () => {
    const filename = generateFilename('png');
    expect(filename).toMatch(/^\d+_[a-f0-9]{16}\.png$/);
  });

  it('generateFilename works with empty extension', () => {
    const filename = generateFilename('');
    expect(filename).toMatch(/^\d+_[a-f0-9]{16}\.$/);
  });

  it('getTempFileUrl builds the correct path', () => {
    expect(getTempFileUrl('file.png')).toBe('/dark_editor_v2/temp/file.png');
  });

  it('getNvidiaApiKey returns the env variable', () => {
    process.env.NVIDIA_API_KEY = 'test-key';
    expect(getNvidiaApiKey()).toBe('test-key');
    delete process.env.NVIDIA_API_KEY;
  });

  it('getNvidiaApiKey returns null when env is unset', () => {
    delete process.env.NVIDIA_API_KEY;
    expect(getNvidiaApiKey()).toBeNull();
  });

  it('deleteTempFile returns true when file exists and deletes it', () => {
    mockExistsSync.mockReturnValue(true);
    expect(deleteTempFile('file.png')).toBe(true);
    expect(mockUnlinkSync).toHaveBeenCalled();
  });

  it('deleteTempFile returns false when file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(deleteTempFile('file.png')).toBe(false);
    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it('getTempFile returns a buffer when file exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(Buffer.from('data'));
    const result = getTempFile('file.png');
    expect(result).toBeInstanceOf(Buffer);
  });

  it('getTempFile returns null when file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(getTempFile('file.png')).toBeNull();
  });

  it('ensureDirectories creates missing directories', () => {
    mockExistsSync.mockReturnValue(false);
    ensureDirectories();
    expect(mockMkdirSync).toHaveBeenCalledTimes(3);
  });

  it('ensureDirectories does nothing when directories already exist', () => {
    mockExistsSync.mockReturnValue(true);
    ensureDirectories();
    expect(mockMkdirSync).not.toHaveBeenCalled();
  });
});
