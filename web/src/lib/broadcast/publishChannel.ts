/**
 * Cross-SPA publish-event channel — listener side declaration.
 *
 * WHY THIS FILE EXISTS:
 *
 * The Dark Editor (Next.js, lives at /editor/{veloxProjectId}) fires a
 * BroadcastChannel postMessage on every successful POST /publish so
 * the main Vite app's Groups card (lives in a different SPA tree
 * under web/src/app/views/GroupsView) can apply the optimistic
 * update synchronously without waiting for its 10s react-query
 * refetchOnWindowFocus / refetchInterval.
 *
 * Both sides MUST use the same channel name + payload shape. The
 * publisher lives in:
 *   web/dark_editor/lib/api/bff.ts (PUBLISH_CHANNEL_NAME +
 *   PublishBroadcastPayload + publishBroadcast)
 *
 * This file is the listener's counterpart. We deliberately duplicate
 * the channel-name constant + payload shape rather than importing
 * across SPA trees (dark_editor and web/src are independent npm
 * projects — sharing types would require either a third package or
 * a path alias that breaks the Next/Vite bundler boundary). Drift
 * would surface as a silent no-op on the listener side (the channel
 * name mismatch means messages never arrive); an integration test
 * downstream guards against it.
 *
 * CHANNEL NAME — DO NOT RENAME without coordinating with both SPAs.
 */

export const PUBLISH_CHANNEL_NAME = 'instaedit-publish' as const;

/**
 * Shape of every message posted on the channel. Mirrors
 * dark_editor's PublishBroadcastPayload exactly. Any field added
 * here MUST also be added in bff.ts.
 */
export interface PublishBroadcastPayload {
  /** Editor session status at the moment of publish. Usually
   *  'published'. The listener ignores events for other statuses
   *  (defence against a stale tab firing the wrong shape). */
  status: string;
  /** YouTube-confirmed privacy at the moment of publish. */
  actual_privacy: string;
  /** Lifecycle marker (confirmed/drift/pending/failed). */
  youtube_sync_status: string;
  /** The editor session id this update applies to. */
  youtube_video_id: string;
  /** velox_project_id for cross-tab debugging. */
  velox_project_id: string;
  /** ISO-8601 stamp — the listener MAY drop events older than a
   *  threshold (e.g. > 60s) to defend against stale tabs. */
  emitted_at: string;
}

/**
 * Type guard for decoded messages. Browser BroadcastChannel is
 * loosely typed (any-event); this guard narrows the message we
 * care about and prevents an unrecognised payload from corrupting
 * the react-query cache.
 */
export function isPublishBroadcastPayload(value: unknown): value is PublishBroadcastPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === 'string' &&
    typeof v.actual_privacy === 'string' &&
    typeof v.youtube_sync_status === 'string' &&
    typeof v.youtube_video_id === 'string' &&
    typeof v.velox_project_id === 'string' &&
    typeof v.emitted_at === 'string'
  );
}
