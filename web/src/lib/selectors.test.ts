/**
 * Selectors Tests
 */

import { describe, it, expect } from 'vitest';
import {
  selectFilteredFiles,
  selectFolderCount,
  selectVideoCount,
  selectSelectedFiles,
  selectHasSelection,
  selectFilesByType,
  selectFilteredChannels,
  selectSelectedChannels,
  selectIsGroupSelected,
  selectCanPublish,
  selectCanSchedule,
  selectUploadTags,
  selectCurrentBreadcrumb,
  selectCanNavigateBack,
  selectAllGroupChannels,
} from '@/lib/selectors';
import type { FileItem } from '@/components/YouTubeManager/hooks/useDriveFolderBrowser';
import type { ChannelOption, ChannelGroupOption } from '@/components/YouTubeManager/hooks/useYouTubeChannelSelection';

describe('File Selectors', () => {
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

  describe('selectHasSelection', () => {
    it('should return true when files selected', () => {
      expect(selectHasSelection(new Set(['file1']))).toBe(true);
    });

    it('should return false when no selection', () => {
      expect(selectHasSelection(new Set())).toBe(false);
    });
  });

  describe('selectFilesByType', () => {
    it('should filter by type', () => {
      const files = selectFilesByType(mockFiles, 'file');
      expect(files).toHaveLength(3);
      
      const folders = selectFilesByType(mockFiles, 'folder');
      expect(folders).toHaveLength(1);
    });
  });
});

describe('Channel Selectors', () => {
  const mockChannels: ChannelOption[] = [
    { id: 'ch1', name: 'Boxe_ITA' },
    { id: 'ch2', name: 'Cocina_Es' },
    { id: 'ch3', name: 'Sports Channel' },
  ];

  describe('selectFilteredChannels', () => {
    it('should return all channels when no search', () => {
      expect(selectFilteredChannels(mockChannels, '')).toHaveLength(3);
    });

    it('should filter by channel name', () => {
      const result = selectFilteredChannels(mockChannels, 'Boxe');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ch1');
    });
  });

  describe('selectSelectedChannels', () => {
    it('should return selected channels', () => {
      const result = selectSelectedChannels(mockChannels, ['ch1', 'ch3']);
      expect(result).toHaveLength(2);
    });
  });

  describe('selectIsGroupSelected', () => {
    it('should return true when all group channels are selected', () => {
      const group: ChannelGroupOption = {
        id: 'g1',
        name: 'Group 1',
        channels: [{ id: 'ch1', name: 'Boxe_ITA' }],
      };
      
      expect(selectIsGroupSelected(group, ['ch1'])).toBe(true);
      expect(selectIsGroupSelected(group, ['ch2'])).toBe(false);
    });
  });
});

describe('Upload Form Selectors', () => {
  const mockFiles: FileItem[] = [
    { id: 'file1', name: 'video1.mp4', type: 'file' },
  ];

  describe('selectCanPublish', () => {
    it('should return true when all requirements met', () => {
      expect(selectCanPublish(mockFiles, ['ch1'], 'Test Title')).toBe(true);
    });

    it('should return false when no files selected', () => {
      expect(selectCanPublish([], ['ch1'], 'Test Title')).toBe(false);
    });

    it('should return false when no channels selected', () => {
      expect(selectCanPublish(mockFiles, [], 'Test Title')).toBe(false);
    });

    it('should return false when no title', () => {
      expect(selectCanPublish(mockFiles, ['ch1'], '')).toBe(false);
    });
  });

  describe('selectCanSchedule', () => {
    it('should return true when all requirements met', () => {
      expect(selectCanSchedule(mockFiles, ['ch1'], 'Title', '2024-12-31', '10:00')).toBe(true);
    });

    it('should return false when no date', () => {
      expect(selectCanSchedule(mockFiles, ['ch1'], 'Title', '', '10:00')).toBe(false);
    });
  });

  describe('selectUploadTags', () => {
    it('should parse comma-separated tags', () => {
      expect(selectUploadTags('tag1, tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should filter empty tags', () => {
      expect(selectUploadTags('tag1, , tag2, ')).toEqual(['tag1', 'tag2']);
    });
  });
});

describe('Breadcrumb Selectors', () => {
  const breadcrumbs = [
    { id: 'root', name: 'Root' },
    { id: 'folder1', name: 'Folder 1' },
    { id: 'folder2', name: 'Folder 2' },
  ];

  describe('selectCurrentBreadcrumb', () => {
    it('should return last breadcrumb', () => {
      const result = selectCurrentBreadcrumb(breadcrumbs);
      expect(result).toEqual({ id: 'folder2', name: 'Folder 2' });
    });

    it('should return undefined for empty array', () => {
      expect(selectCurrentBreadcrumb([])).toBeUndefined();
    });
  });

  describe('selectCanNavigateBack', () => {
    it('should return true when multiple breadcrumbs', () => {
      expect(selectCanNavigateBack(3)).toBe(true);
    });

    it('should return false when only one', () => {
      expect(selectCanNavigateBack(1)).toBe(false);
    });
  });
});

describe('Group Selectors', () => {
  describe('selectAllGroupChannels', () => {
    it('should return unique channels from all groups', () => {
      const groups: ChannelGroupOption[] = [
        {
          id: 'g1',
          name: 'Group 1',
          channels: [
            { id: 'ch1', name: 'Channel 1' },
            { id: 'ch2', name: 'Channel 2' },
          ],
        },
        {
          id: 'g2',
          name: 'Group 2',
          channels: [
            { id: 'ch2', name: 'Channel 2' },  // Duplicate
            { id: 'ch3', name: 'Channel 3' },
          ],
        },
      ];

      const result = selectAllGroupChannels(groups);
      expect(result).toHaveLength(3);
      expect(result.map(ch => ch.id)).toContain('ch1');
      expect(result.map(ch => ch.id)).toContain('ch2');
      expect(result.map(ch => ch.id)).toContain('ch3');
    });
  });
});
