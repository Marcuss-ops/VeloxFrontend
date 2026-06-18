/**
 * useYouTubePublish Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYouTubePublish } from '@/components/YouTubeManager/hooks/useYouTubePublish';
import { driveApi, youtubeApi } from '@/lib/api';
import type { FileItem } from '@/components/YouTubeManager/hooks/useDriveFolderBrowser';

// Mock the APIs
vi.mock('@/lib/api', () => ({
  driveApi: {
    stageDownload: vi.fn(),
  },
  youtubeApi: {
    uploadFromPath: vi.fn(),
  },
}));

const mockDriveApi = vi.mocked(driveApi);
const mockYoutubeApi = vi.mocked(youtubeApi);

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('useYouTubePublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFiles: FileItem[] = [
    { id: 'file1', name: 'video1.mp4', type: 'file' },
  ];

  const mockChannels = ['ch1', 'ch2'];

  describe('publishNow', () => {
    it('should block publish if no channels selected', async () => {
      const { result } = renderHook(() => useYouTubePublish());

      await expect(
        act(async () => {
          await result.current.publishNow(mockFiles, [], {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          });
        })
      ).rejects.toThrow('Select at least one YouTube channel');
    });

    it('should block publish if no files selected', async () => {
      const { result } = renderHook(() => useYouTubePublish());

      await expect(
        act(async () => {
          await result.current.publishNow([], mockChannels, {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          });
        })
      ).rejects.toThrow('No files selected for upload');
    });

    it('should stage file before upload', async () => {
      mockDriveApi.stageDownload.mockResolvedValueOnce('/tmp/test_path');
      mockYoutubeApi.uploadFromPath.mockResolvedValueOnce({ ok: true, result: {} as any });

      const { result } = renderHook(() => useYouTubePublish());

      await act(async () => {
        await result.current.publishNow(mockFiles, ['ch1'], {
          title: 'Test Video',
          description: 'Description',
          tags: 'tag1, tag2',
          visibility: 'private',
        });
      });

      expect(mockDriveApi.stageDownload).toHaveBeenCalledWith('file1');
    });

    it('should call upload once per file x channel', async () => {
      mockDriveApi.stageDownload.mockResolvedValue('/tmp/test_path');
      mockYoutubeApi.uploadFromPath.mockResolvedValue({ ok: true, result: {} as any });

      const { result } = renderHook(() => useYouTubePublish());

      let publishResult: any;
      await act(async () => {
        publishResult = await result.current.publishNow(
          [{ id: 'f1', name: 'v1.mp4', type: 'file' }, { id: 'f2', name: 'v2.mp4', type: 'file' }],
          ['ch1', 'ch2'],
          {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          }
        );
      });

      // 2 files x 2 channels = 4 uploads
      expect(mockYoutubeApi.uploadFromPath).toHaveBeenCalledTimes(4);
      expect(publishResult!.uploads).toHaveLength(4);
    });

    it('should propagate backend error', async () => {
      mockDriveApi.stageDownload.mockResolvedValueOnce('/tmp/test_path');
      mockYoutubeApi.uploadFromPath.mockRejectedValueOnce(new Error('Backend error'));

      const { result } = renderHook(() => useYouTubePublish());

      await expect(
        act(async () => {
          await result.current.publishNow(mockFiles, ['ch1'], {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          });
        })
      ).rejects.toThrow('Backend error');

      // Check error state after async operation
      await act(async () => {
        await flushPromises();
      });

      expect(result.current.error).toBe('Backend error');
    });
  });

  describe('schedulePublish', () => {
    it('should block schedule if no date/time', async () => {
      const { result } = renderHook(() => useYouTubePublish());

      await expect(
        act(async () => {
          await result.current.schedulePublish(mockFiles, mockChannels, {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          });
        })
      ).rejects.toThrow('Select a date and time for publishing');
    });

    it('should schedule with date and time', async () => {
      mockDriveApi.stageDownload.mockResolvedValueOnce('/tmp/test_path');
      mockYoutubeApi.uploadFromPath.mockResolvedValueOnce({ ok: true, result: {} as any });

      const { result } = renderHook(() => useYouTubePublish());

      let scheduleResult: any;
      await act(async () => {
        scheduleResult = await result.current.schedulePublish(mockFiles, ['ch1'], {
          title: 'Test',
          description: '',
          tags: '',
          visibility: 'private',
          scheduleDate: '2024-12-31',
          scheduleTime: '10:00',
        });
      });

      expect(scheduleResult.uploads).toHaveLength(1);
    });
  });

  describe('isPublishing state', () => {
    it('should set isPublishing during upload', async () => {
      mockDriveApi.stageDownload.mockResolvedValueOnce('/tmp/test_path');
      
      // Slow mock upload - use callback to control timing
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise(resolve => {
        resolveUpload = resolve;
      });
      
      mockYoutubeApi.uploadFromPath.mockReturnValueOnce(uploadPromise as any);

      const { result } = renderHook(() => useYouTubePublish());

      // Start publish
      let publishPromise: any;
      await act(async () => {
        publishPromise = result.current.publishNow(mockFiles, ['ch1'], {
          title: 'Test',
          description: '',
          tags: '',
          visibility: 'private',
        });
        // Let async flow advance to uploadFromPath
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // Check isPublishing
      expect(result.current.isPublishing).toBe(true);

      // Resolve the upload
      await act(async () => {
        resolveUpload!({ ok: true, result: {} as any });
        await flushPromises();
      });

      await publishPromise;
      
      // Check isPublishing is false after completion
      expect(result.current.isPublishing).toBe(false);
    });
  });
});
