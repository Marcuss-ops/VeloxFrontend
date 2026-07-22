/**
 * useYouTubePublish Hook
 *
 * Manages the publishing workflow through Velox/InstaEdit destinations:
 * - Takes selected Drive files and destination ids
 * - Creates a Velox job per (file, destination) pair
 * - Velox/InstaEdit handle the actual platform upload using opaque destinations
 */

import { useState, useCallback } from 'react';
import { veloxApi } from '@/lib/api';
import type { FileItem } from './useDriveFolderBrowser';

// Types
export interface PublishOptions {
  /** Video title */
  title: string;
  /** Video description */
  description: string;
  /** Comma-separated tags */
  tags: string;
  /** Privacy setting */
  visibility: 'private' | 'public' | 'unlisted';
  /** Schedule date (ISO format) */
  scheduleDate?: string;
  /** Schedule time (HH:MM format) */
  scheduleTime?: string;
}

export interface CreatedJob {
  fileName: string;
  externalDestinationId: string;
  jobId: string;
}

export interface PublishResult {
  /** Number of Velox jobs created */
  successCount: number;
  /** Created job details */
  jobs: CreatedJob[];
}

export interface UseYouTubePublishReturn {
  /** Whether publishing is in progress */
  isPublishing: boolean;
  /** Error message if any */
  error: string | null;

  // Actions
  /** Publish selected files now */
  publishNow: (
    files: FileItem[],
    destinationIds: string[],
    options: PublishOptions
  ) => Promise<PublishResult>;

  /** Schedule files for later */
  schedulePublish: (
    files: FileItem[],
    destinationIds: string[],
    options: PublishOptions
  ) => Promise<PublishResult>;
}

/**
 * Strip file extension from name
 */
function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

/**
 * Hook to manage publishing through Velox/InstaEdit destinations.
 */
export function useYouTubePublish(): UseYouTubePublishReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildMetadata = (file: FileItem, options: PublishOptions): Record<string, unknown> => {
    const tagList = options.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const metadata: Record<string, unknown> = {
      title: options.title.trim() || stripExtension(file.name),
      description: options.description,
      tags: tagList,
      privacy_status: options.visibility,
    };

    if (options.scheduleDate && options.scheduleTime) {
      metadata.scheduled_time = `${options.scheduleDate}T${options.scheduleTime}`;
    }

    return metadata;
  };

  const createVeloxJob = async (
    file: FileItem,
    destinationId: string,
    options: PublishOptions
  ): Promise<CreatedJob> => {
    const job = await veloxApi.createJob({
      projectId: file.id,
      renderSpec: {
        type: 'passthrough',
        source: 'drive',
        driveFileId: file.id,
        driveFileName: file.name,
      },
      deliveryPlan: {
        destinations: [
          {
            externalDestinationId: destinationId,
            metadata: buildMetadata(file, options),
          },
        ],
      },
    });

    return {
      fileName: file.name,
      externalDestinationId: destinationId,
      jobId: job.id,
    };
  };

  /**
   * Publish videos immediately
   */
  const publishNow = useCallback(
    async (
      files: FileItem[],
      destinationIds: string[],
      options: PublishOptions
    ): Promise<PublishResult> => {
      // Validation
      if (files.length === 0) {
        throw new Error('No files selected for upload');
      }
      if (destinationIds.length === 0) {
        throw new Error('Select at least one destination');
      }

      setIsPublishing(true);
      setError(null);

      try {
        const jobs: CreatedJob[] = [];

        for (const file of files) {
          for (const destinationId of destinationIds) {
            const created = await createVeloxJob(file, destinationId, options);
            jobs.push(created);
          }
        }

        return {
          successCount: jobs.length,
          jobs,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Publishing failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsPublishing(false);
      }
    },
    []
  );

  /**
   * Schedule videos for later publishing
   */
  const schedulePublish = useCallback(
    async (
      files: FileItem[],
      destinationIds: string[],
      options: PublishOptions
    ): Promise<PublishResult> => {
      // Validation
      if (!options.scheduleDate || !options.scheduleTime) {
        throw new Error('Select a date and time for publishing');
      }
      if (files.length === 0) {
        throw new Error('No files selected for upload');
      }

      setIsPublishing(true);
      setError(null);

      try {
        const jobs: CreatedJob[] = [];

        for (const file of files) {
          for (const destinationId of destinationIds) {
            const created = await createVeloxJob(file, destinationId, options);
            jobs.push(created);
          }
        }

        return {
          successCount: jobs.length,
          jobs,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Scheduling failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsPublishing(false);
      }
    },
    []
  );

  return {
    isPublishing,
    error,
    publishNow,
    schedulePublish,
  };
}

export default useYouTubePublish;
