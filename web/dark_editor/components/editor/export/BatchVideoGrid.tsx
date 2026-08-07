'use client';

import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import { BatchVideoCard } from './BatchVideoCard';

interface BatchVideoGridProps {
  videos: GroupVideo[];
  selectedVideoIds: string[];
  variantPreviews: Record<string, { previewUrl: string }>;
  localizedMetadata: Record<string, { language?: string; title?: string; description?: string }>;
  uploadResults: Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>;
  onToggle: (video: GroupVideo) => void;
  onEdit: (video: GroupVideo) => void;
}

export function BatchVideoGrid({ videos, selectedVideoIds, variantPreviews, localizedMetadata, uploadResults, onToggle, onEdit }: BatchVideoGridProps) {
  return (
    <div className="grid min-h-0 content-start grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <BatchVideoCard key={`${video.platform_account_id}:${video.youtube_video_id}`} video={video} selected={selectedVideoIds.includes(video.video_id)} previewUrl={variantPreviews[video.video_id]?.previewUrl} variant={variantPreviews[video.video_id]} localizedMetadata={localizedMetadata[video.video_id]} result={uploadResults[video.video_id]} onToggle={() => onToggle(video)} onEdit={variantPreviews[video.video_id] ? () => onEdit(video) : undefined} />
      ))}
    </div>
  );
}
