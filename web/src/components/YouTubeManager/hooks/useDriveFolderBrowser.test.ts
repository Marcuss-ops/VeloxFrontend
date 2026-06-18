/**
 * useDriveFolderBrowser Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDriveFolderBrowser } from '@/components/YouTubeManager/hooks/useDriveFolderBrowser';
import { driveApi } from '@/lib/api';

// Mock the driveApi
vi.mock('@/lib/api', () => ({
  driveApi: {
    files: vi.fn(),
  },
}));

const mockDriveApi = vi.mocked(driveApi);

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('useDriveFolderBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial load', () => {
    it('should load initial folder', async () => {
      const mockFiles = {
        files: [
          { id: 'file1', name: 'video1.mp4', mimeType: 'video/mp4' },
          { id: 'folder1', name: 'SubFolder', mimeType: 'application/vnd.google-apps.folder' },
        ],
      };

      mockDriveApi.files.mockResolvedValueOnce(mockFiles);

      const { result } = renderHook(() => useDriveFolderBrowser());

      // Wait for async load
      await act(async () => {
        await flushPromises();
      });

      expect(mockDriveApi.files).toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.driveAvailable).toBe(true);
    });

    it('should handle API error', async () => {
      mockDriveApi.files.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.driveAvailable).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should navigate to folder', async () => {
      mockDriveApi.files.mockResolvedValue({ files: [] });

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      // Navigate to subfolder
      act(() => {
        result.current.navigateToFolder('folder1_valid_drive_id_24chars', 'SubFolder');
      });

      expect(result.current.breadcrumbs).toHaveLength(2);
      expect(result.current.breadcrumbs[1].name).toBe('SubFolder');
    });

    it('should navigate to breadcrumb', async () => {
      mockDriveApi.files.mockResolvedValue({ files: [] });

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      // Navigate deeper
      act(() => {
        result.current.navigateToFolder('folder1_valid_drive_id_24chars', 'SubFolder');
      });

      // Navigate back
      act(() => {
        result.current.navigateToBreadcrumb(0);
      });

      expect(result.current.breadcrumbs).toHaveLength(1);
    });
  });

  describe('selection', () => {
    it('should toggle file selection', async () => {
      mockDriveApi.files.mockResolvedValue({
        files: [
          { id: 'file1', name: 'video1.mp4', mimeType: 'video/mp4' },
        ],
      });

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.files).toHaveLength(1);

      // Toggle selection
      act(() => {
        result.current.toggleSelection('file1');
      });

      expect(result.current.selectedIds.has('file1')).toBe(true);

      // Deselect
      act(() => {
        result.current.toggleSelection('file1');
      });

      expect(result.current.selectedIds.has('file1')).toBe(false);
    });

    it('should clear selection', async () => {
      mockDriveApi.files.mockResolvedValue({
        files: [
          { id: 'file1', name: 'video1.mp4', mimeType: 'video/mp4' },
          { id: 'file2', name: 'video2.mp4', mimeType: 'video/mp4' },
        ],
      });

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      // Select both
      act(() => {
        result.current.toggleSelection('file1');
        result.current.toggleSelection('file2');
      });

      expect(result.current.selectedIds.size).toBe(2);

      // Clear
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('search', () => {
    it('should filter files by search query', async () => {
      mockDriveApi.files.mockResolvedValue({
        files: [
          { id: 'file1', name: 'boxing_match.mp4', mimeType: 'video/mp4' },
          { id: 'file2', name: 'cooking_show.mp4', mimeType: 'video/mp4' },
        ],
      });

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.files).toHaveLength(2);

      // Set search query
      act(() => {
        result.current.setSearchQuery('boxing');
      });

      expect(result.current.filteredFiles).toHaveLength(1);
      expect(result.current.filteredFiles[0].name).toBe('boxing_match.mp4');
    });
  });

  describe('getSelectedFiles', () => {
    it('should return only selected files (not folders)', async () => {
      mockDriveApi.files.mockResolvedValue({
        files: [
          { id: 'file1', name: 'video1.mp4', mimeType: 'video/mp4' },
          { id: 'folder1', name: 'SubFolder', mimeType: 'application/vnd.google-apps.folder' },
        ],
      });

      const { result } = renderHook(() => useDriveFolderBrowser());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.files).toHaveLength(2);

      // Select both file and folder
      act(() => {
        result.current.toggleSelection('file1');
        result.current.toggleSelection('folder1');
      });

      const selectedFiles = result.current.getSelectedFiles();

      expect(selectedFiles).toHaveLength(1);
      expect(selectedFiles[0].id).toBe('file1');
    });
  });
});
