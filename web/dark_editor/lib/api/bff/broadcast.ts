// ------------------------------------------------------------------
// Cross-SPA BroadcastChannel — publish-success instant card update
//
// Lives in lib/api/bff/broadcast.ts (commit 7 of the api-bff refactor
// series; the FINAL structural commit). The dark editor (publisher)
// and the InstaEdit Social SPA (listener) MUST use the same channel
// name — the InstaEdit Social app owns the listener side.
//
// Re-exported at lib/api/bff.ts (the barrel) so legacy
// `@/lib/api/bff` callers (ExportDialog + useEditorSessionLiveUpdate +
// bff.publishEditorSession.test.ts) keep working without import-path
// churn.
// ------------------------------------------------------------------

/**
 * PUBLISH_CHANNEL_NAME — the BroadcastChannel name both the dark
 * editor (publisher) and the main Vite app (listener) MUST use.
 *
 * IMPORTANT: keep the name stable — a rename breaks the cross-SPA
 * contract. Documented in web/src/lib/broadcast/publishChannel.ts
 * (the listener side declares the same constant).
 */
export const PUBLISH_CHANNEL_NAME = 'instaedit-publish';

/** Payload shape exchanged over `PUBLISH_CHANNEL_NAME`. */
export interface PublishBroadcastPayload {
  /** 'published' after the publish orchestrator stamps. */
  status: string;
  /** YouTube-confirmed privacy at the moment of publish. */
  actual_privacy: string;
  /** Lifecycle marker (confirmed/drift/pending/failed). */
  youtube_sync_status: string;
  /** The editor session id this update applies to. The listener
   *  uses this to locate the cache entry to mutate. */
  youtube_video_id: string;
  /** velox_project_id for cross-tab debugging. */
  velox_project_id: string;
  /** ISO-8601 stamp for the listener to ignore stale events. */
  emitted_at: string;
}

/**
 * publishBroadcast — fire a BroadcastChannel event so the InstaEdit
 * Social SPA can apply the optimistic update synchronously without
 * polling.
 *
 * Defensive in headless/test environments: if BroadcastChannel is
 * undefined (Node, Vitest, JSDOM without polyfill), this is a no-op.
 * The POST response payload is the authoritative source of truth —
 * the broadcast is purely an optimization for the cross-tab UX.
 */
export function publishBroadcast(
  payload: Omit<PublishBroadcastPayload, 'emitted_at'>
): void {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }
  try {
    const channel = new BroadcastChannel(PUBLISH_CHANNEL_NAME);
    const full: PublishBroadcastPayload = {
      ...payload,
      emitted_at: new Date().toISOString(),
    };
    channel.postMessage(full);
    // Immediately close — keep the channel pool clean across many
    // publishes. The browser costs ~zero resources for a no-listener
    // channel; the close is purely hygiene.
    channel.close();
  } catch {
    // Defensive: BroadcastChannel can throw on some browsers when
    // permissions for cross-origin frames are missing. The main
    // SPA still has its 10s polling fallback.
  }
}