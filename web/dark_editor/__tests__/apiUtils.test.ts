import { describe, it, expect } from 'vitest';
import { extractFilenameFromPath, getTempFileUrl, getProjectFileUrl } from '@/lib/api';

describe('extractFilenameFromPath', () => {
  it('extracts filename from a path', () => {
    expect(extractFilenameFromPath('/uploads/image.png')).toBe('image.png');
  });

  it('strips query parameters', () => {
    expect(extractFilenameFromPath('/uploads/image.png?token=abc')).toBe('image.png');
  });

  it('strips hash fragments', () => {
    expect(extractFilenameFromPath('/uploads/image.png#preview')).toBe('image.png');
  });

  it('returns the original string for plain filenames', () => {
    expect(extractFilenameFromPath('image.png')).toBe('image.png');
  });

  it('returns empty string for empty input', () => {
    expect(extractFilenameFromPath('')).toBe('');
  });
});

describe('URL helpers', () => {
  it('getTempFileUrl builds the temp URL', () => {
    expect(getTempFileUrl('file.png')).toBe('/dark_editor_v2/temp/file.png');
  });

  it('getProjectFileUrl builds the project file URL', () => {
    expect(getProjectFileUrl('p1', 'file.png')).toBe('/dark_editor_v2/projects/p1/file.png');
  });
});
