import { describe, it, expect } from 'vitest';
import {
  selectFilteredFiles,
  selectFolderCount,
  selectVideoCount,
  selectSelectedFiles,
  type FileItem,
} from '@/lib/selectors';

describe('Drive File Selectors', () => {
  const mockFiles: FileItem[] = [
    { id: 'file1', name: 'video1.mp4', type: 'file' },
    { id: 'file2', name: 'video2.mp4', type: 'file' },
    { id: 'folder1', name: 'SubFolder', type: 'folder' },
    { id: 'file3', name: 'boxing_match.mp4', type: 'file' },
  ];

  describe('selectFilteredFiles', () => {
    it('should return all files when no search query', () => {
      const result = selectFilteredFiles(mockFiles, '');
      expect(result).toHaveLength(4);
    });

    it('should filter by search query', () => {
      const result = selectFilteredFiles(mockFiles, 'boxing');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('boxing_match.mp4');
    });

    it('should be case insensitive', () => {
      const result = selectFilteredFiles(mockFiles, 'VIDEO');
      expect(result).toHaveLength(2);
    });
  });

  describe('selectFolderCount', () => {
    it('should count folders', () => {
      expect(selectFolderCount(mockFiles)).toBe(1);
    });
  });

  describe('selectVideoCount', () => {
    it('should count video files', () => {
      expect(selectVideoCount(mockFiles)).toBe(3);
    });
  });

  describe('selectSelectedFiles', () => {
    it('should return only selected files (not folders)', () => {
      const selectedIds = new Set(['file1', 'folder1']);
      const result = selectSelectedFiles(mockFiles, selectedIds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('file1');
    });
  });
});
