/**
 * useYouTubePublish Hook Tests
 *
 * These tests verify that the hook creates Velox jobs with
 * external_destination_id values instead of calling YouTube directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYouTubePublish } from '@/components/YouTubeManager/hooks/useYouTubePublish';
import { veloxApi } from '@/lib/api';
import type { FileItem } from '@/components/YouTubeManager/hooks/useDriveFolderBrowser';

// Mock the APIs
vi.mock('@/lib/api', () => ({
  veloxApi: {
    createJob: vi.fn(),
  },
}));

const mockVeloxApi = vi.mocked(veloxApi);

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('useYouTubePublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFiles: FileItem[] = [
    { id: 'file1', name: 'video1.mp4', type: 'file' },
  ];

  const mockDestinations = ['extdst_01jabc123', 'extdst_01jdef456'];

  describe('publishNow', () => {
    it('should block publish if no destinations selected', async () => {
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
      ).rejects.toThrow('Select at least one destination');
    });

    it('should block publish if no files selected', async () => {
      const { result } = renderHook(() => useYouTubePublish());

      await expect(
        act(async () => {
          await result.current.publishNow([], mockDestinations, {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          });
        })
      ).rejects.toThrow('No files selected for upload');
    });

    it('should create a Velox job per file x destination', async () => {
      mockVeloxApi.createJob.mockResolvedValue({ id: 'job_123', renderStatus: 'PENDING' } as any);

      const { result } = renderHook(() => useYouTubePublish());

      let publishResult: any;
      await act(async () => {
        publishResult = await result.current.publishNow(
          [{ id: 'f1', name: 'v1.mp4', type: 'file' }],
          ['extdst_01jabc123'],
          {
            title: 'Test Video',
            description: 'Description',
            tags: 'tag1, tag2',
            visibility: 'private',
          }
        );
      });

      expect(mockVeloxApi.createJob).toHaveBeenCalledTimes(1);
      expect(mockVeloxApi.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'f1',
          renderSpec: expect.objectContaining({
            type: 'passthrough',
            source: 'drive',
            driveFileId: 'f1',
            driveFileName: 'v1.mp4',
          }),
          deliveryPlan: {
            destinations: [
              expect.objectContaining({
                externalDestinationId: 'extdst_01jabc123',
                metadata: expect.objectContaining({
                  title: 'Test Video',
                  description: 'Description',
                  tags: ['tag1', 'tag2'],
                  privacy_status: 'private',
                }),
              }),
            ],
          },
        })
      );
      expect(publishResult!.jobs).toHaveLength(1);
      expect(publishResult!.jobs[0].jobId).toBe('job_123');
    });

    it('should create multiple Velox jobs for multiple destinations', async () => {
      mockVeloxApi.createJob.mockResolvedValue({ id: 'job_123', renderStatus: 'PENDING' } as any);

      const { result } = renderHook(() => useYouTubePublish());

      let publishResult: any;
      await act(async () => {
        publishResult = await result.current.publishNow(
          [
            { id: 'f1', name: 'v1.mp4', type: 'file' },
            { id: 'f2', name: 'v2.mp4', type: 'file' },
          ],
          ['extdst_01jabc123', 'extdst_01jdef456'],
          {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          }
        );
      });

      // 2 files x 2 destinations = 4 jobs
      expect(mockVeloxApi.createJob).toHaveBeenCalledTimes(4);
      expect(publishResult!.jobs).toHaveLength(4);
    });

    it('should propagate backend error', async () => {
      mockVeloxApi.createJob.mockRejectedValueOnce(new Error('Backend error'));

      const { result } = renderHook(() => useYouTubePublish());

      await expect(
        act(async () => {
          await result.current.publishNow(mockFiles, ['extdst_01jabc123'], {
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
          await result.current.schedulePublish(mockFiles, mockDestinations, {
            title: 'Test',
            description: '',
            tags: '',
            visibility: 'private',
          });
        })
      ).rejects.toThrow('Select a date and time for publishing');
    });

    it('should schedule with date and time', async () => {
      mockVeloxApi.createJob.mockResolvedValue({ id: 'job_456', renderStatus: 'PENDING' } as any);

      const { result } = renderHook(() => useYouTubePublish());

      let scheduleResult: any;
      await act(async () => {
        scheduleResult = await result.current.schedulePublish(mockFiles, ['extdst_01jabc123'], {
          title: 'Test',
          description: '',
          tags: '',
          visibility: 'private',
          scheduleDate: '2024-12-31',
          scheduleTime: '10:00',
        });
      });

      expect(mockVeloxApi.createJob).toHaveBeenCalledTimes(1);
      expect(mockVeloxApi.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryPlan: {
            destinations: [
              expect.objectContaining({
                metadata: expect.objectContaining({
                  scheduled_time: '2024-12-31T10:00',
                }),
              }),
            ],
          },
        })
      );
      expect(scheduleResult.jobs).toHaveLength(1);
    });
  });

  describe('isPublishing state', () => {
    it('should set isPublishing during job creation', async () => {
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });
      mockVeloxApi.createJob.mockReturnValueOnce(createPromise as any);

      const { result } = renderHook(() => useYouTubePublish());

      let publishPromise: any;
      await act(async () => {
        publishPromise = result.current.publishNow(mockFiles, ['extdst_01jabc123'], {
          title: 'Test',
          description: '',
          tags: '',
          visibility: 'private',
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.isPublishing).toBe(true);

      await act(async () => {
        resolveCreate!({ id: 'job_789', renderStatus: 'PENDING' });
        await flushPromises();
      });

      await publishPromise;

      expect(result.current.isPublishing).toBe(false);
    });
  });
});
