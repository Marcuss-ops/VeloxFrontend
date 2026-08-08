import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';

/**
 * The backend orders group videos newest-first for every account. Keep the
 * first occurrence of each account as the batch candidate.
 */
export function selectLatestPerChannel(videos: readonly GroupVideo[]): GroupVideo[] {
  const seenAccounts = new Set<number>();
  return videos.filter((video) => {
    if (seenAccounts.has(video.platform_account_id)) return false;
    seenAccounts.add(video.platform_account_id);
    return true;
  });
}
