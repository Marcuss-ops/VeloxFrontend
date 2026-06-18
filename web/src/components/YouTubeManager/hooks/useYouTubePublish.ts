/**
 * useYouTubePublish Hook
 * 
 * Manages YouTube video publishing workflow including:
 * - File staging from Drive
 * - Upload to multiple channels
 * - Scheduling
 * 
 * Extracted from DriveImporter to separate publish logic from UI.
 */

import { useState, useCallback } from 'react';
import { driveApi, youtubeApi, type YouTubeUploadOptions } from '@/lib/api';
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

export interface PublishResult {
  /** Number of successful uploads */
  successCount: number;
  /** Upload details */
  uploads: Array<{ fileName: string; channelId: string }>;
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
    channelIds: string[],
    options: PublishOptions
  ) => Promise<PublishResult>;
  
  /** Schedule files for later */
  schedulePublish: (
    files: FileItem[],
    channelIds: string[],
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
 * Hook to manage YouTube video publishing
 */
export function useYouTubePublish(): UseYouTubePublishReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Publish videos immediately
   */
  const publishNow = useCallback(async (
    files: FileItem[],
    channelIds: string[],
    options: PublishOptions
  ): Promise<PublishResult> => {
    // Validation
    if (files.length === 0) {
      throw new Error('No files selected for upload');
    }
    if (channelIds.length === 0) {
      throw new Error('Select at least one YouTube channel');
    }

    setIsPublishing(true);
    setError(null);

    try {
      const tagList = options.tags.split(',').map(t => t.trim()).filter(Boolean);
      const uploads: Array<{ fileName: string; channelId: string }> = [];

      // Stage and upload each file
      for (const file of files) {
        const stagedFilePath = await driveApi.stageDownload(file.id);
        const uploadTitle = options.title.trim() || stripExtension(file.name);

        // Upload to each channel
        for (const channelId of channelIds) {
          await youtubeApi.uploadFromPath(stagedFilePath, {
            channel_id: channelId,
            title: uploadTitle,
            description: options.description,
            tags: tagList,
            privacy: options.visibility,
          });
          uploads.push({ fileName: file.name, channelId });
        }
      }

      return {
        successCount: uploads.length,
        uploads,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Publishing failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, []);

  /**
   * Schedule videos for later publishing
   */
  const schedulePublish = useCallback(async (
    files: FileItem[],
    channelIds: string[],
    options: PublishOptions
  ): Promise<PublishResult> => {
    // Validation
    if (!options.scheduleDate || !options.scheduleTime) {
      throw new Error('Select a date and time for publishing');
    }
    if (files.length === 0) {
      throw new Error('No files selected for upload');
    }

    const publishAt = new Date(`${options.scheduleDate}T${options.scheduleTime}`);
    
    setIsPublishing(true);
    setError(null);

    try {
      const tagList = options.tags.split(',').map(t => t.trim()).filter(Boolean);
      const uploads: Array<{ fileName: string; channelId: string }> = [];

      // Stage and schedule each file
      for (const file of files) {
        const stagedFilePath = await driveApi.stageDownload(file.id);
        const uploadTitle = options.title.trim() || stripExtension(file.name);

        // Schedule for each channel
        for (const channelId of channelIds) {
          await youtubeApi.uploadFromPath(stagedFilePath, {
            channel_id: channelId,
            title: uploadTitle,
            description: options.description,
            tags: tagList,
            privacy: options.visibility,
            scheduled_time: publishAt.toISOString(),
          });
          uploads.push({ fileName: file.name, channelId });
        }
      }

      return {
        successCount: uploads.length,
        uploads,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Scheduling failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, []);

  return {
    isPublishing,
    error,
    publishNow,
    schedulePublish,
  };
}

export default useYouTubePublish;
