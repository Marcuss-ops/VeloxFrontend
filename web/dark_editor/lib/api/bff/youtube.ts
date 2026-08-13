// BFF YouTube client — InstaEditor's thin wrapper around the InstaEdit
// BFF's /api/v1/youtube/* endpoints (publish + draft auto-save +
// session-detail read + short-poll helper).
//
// Runtime module. The wire types (YouTubeTranslation,
// PublishYouTubeEditorSessionRequest/Response, EditorSessionDetail,
// YouTubeEditorSessionDraftRequest/Response) live in youtube/types.ts and
// are re-exported below for back-compat. The shared CSRF-aware fetcher and
// poll timing constants come from ./client; the PollResult short-poll shape
// comes from ./youtube/types alongside the wire types.
//
// Public surface (4 runtime functions + 6 re-exported wire types):
//   - publishEditorSession(veloxProjectId, body)
//   - getEditorSessionByProject(veloxProjectId)
//   - pollEditorSessionUntilConfirmed(veloxProjectId, opts)
//   - saveEditorSessionDraft(veloxProjectId, body)

import { bffFetch, POLL_INTERVAL_MS, POLL_MAX_ATTEMPTS } from './client';
import type {
  EditorSessionDetail,
  PollResult,
  PublishYouTubeEditorSessionRequest,
  PublishYouTubeEditorSessionResponse,
  YouTubeEditorSessionDraftRequest,
  YouTubeEditorSessionDraftResponse,
} from './youtube/types';

export type {
  YouTubeTranslation,
  PublishYouTubeEditorSessionRequest,
  PublishYouTubeEditorSessionResponse,
  EditorSessionDetail,
  YouTubeEditorSessionDraftRequest,
  YouTubeEditorSessionDraftResponse,
  PollResult,
  PollResultStatus,
} from './youtube/types';

export async function publishEditorSession(
  veloxProjectId: string,
  body: PublishYouTubeEditorSessionRequest
): Promise<PublishYouTubeEditorSessionResponse> {
  const response = await bffFetch<PublishYouTubeEditorSessionResponse>(
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}/publish`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  // Contract guard: the InstaEdit Social SPA relies on this field for optimistic
  // updates. A backend response that omits it would silently break the
  // cross-SPA broadcast, so fail fast instead of propagating an undefined
  // value.
  if (!response || typeof response.status !== 'string') {
    throw new Error('Contract error: publish response is missing the required status field');
  }

  return response;
}

export async function getEditorSessionByProject(
  veloxProjectId: string
): Promise<EditorSessionDetail> {
  return bffFetch<EditorSessionDetail>(
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}`
  );
}

// ------------------------------------------------------------------
// Short-poll helper — designed for the post-publish window where the
// drift reconciler may take a few seconds to stamp actual_privacy.
// We poll GET /by-project/{id} every POLL_INTERVAL_MS until either:
//
//   (a) status === 'published' AND youtube_sync_status === 'confirmed'
//       — the orchestrator + YouTube both confirmed; we're done.
//   (b) POLL_MAX_ATTEMPTS exhausted — surface a 'timeout' result so
//       the caller can decide whether to keep polling or give up
//       gracefully (the next refetchOnWindowFocus will catch up).
//
// Returns the LAST observed state (or the first observed state on
// no-progress) so the caller can read whatever the reconciler
// ultimately left on the row.
// ------------------------------------------------------------------

export async function pollEditorSessionUntilConfirmed(
  veloxProjectId: string,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
  } = {}
): Promise<PollResult> {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? POLL_MAX_ATTEMPTS;
  let lastDetail = await getEditorSessionByProject(veloxProjectId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (lastDetail.status === 'published' && lastDetail.youtube_sync_status === 'confirmed') {
      return { status: 'confirmed', attempts: attempt, detail: lastDetail };
    }
    // Short-circuit on abort signal.
    if (options.signal?.aborted) {
      return { status: 'timeout', attempts: attempt, detail: lastDetail };
    }
    // Wait the interval (skip on the final attempt so we don't sleep
    // needlessly before returning 'timeout').
    if (attempt < maxAttempts) {
      await new Promise<void>((resolve) => {
        const handle = setTimeout(resolve, intervalMs);
        // Allow the caller to abort the wait.
        options.signal?.addEventListener('abort', () => clearTimeout(handle), { once: true });
      });
      if (options.signal?.aborted) {
        return { status: 'timeout', attempts: attempt, detail: lastDetail };
      }
    }
    lastDetail = await getEditorSessionByProject(veloxProjectId);
  }

  return { status: 'timeout', attempts: maxAttempts, detail: lastDetail };
}

export async function saveEditorSessionDraft(
  veloxProjectId: string,
  body: YouTubeEditorSessionDraftRequest
): Promise<YouTubeEditorSessionDraftResponse> {
  return bffFetch<YouTubeEditorSessionDraftResponse>(
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}/draft`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );
}
