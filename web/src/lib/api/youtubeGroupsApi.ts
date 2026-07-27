/**
 * YouTube Groups API wrapper.
 *
 * Talks to the InstaeditLogin BFF via session cookies + the CSRF
 * double-submit pattern provided by `client.ts`. The SPA NEVER holds a
 * YouTube OAuth token — all auth lives behind the cookie.
 */

import { apiGet, apiPost } from '@/lib/api/client';
import type {
    CreateYouTubeEditorSessionRequest,
    CreateYouTubeEditorSessionResponse,
    GroupYouTubeVideosResponse,
} from '@/types/youtubeGroups';

/**
 * GET /api/v1/groups/{group_id}/youtube/videos
 * Returns the private/unlisted/processed videos across every YouTube
 * account in the requested group, joined with the existing per-video
 * editor_session rows.
 *
 * `includeSubgroups=true` walks the parent_group_id tree so the
 * requested group PLUS its transitive children are aggregated.
 * The backend caps at 200 accounts / 500 videos per request.
 */
export async function listGroupYouTubeVideos(
    groupId: number | string,
    options: { includeSubgroups?: boolean; signal?: AbortSignal } = {},
): Promise<GroupYouTubeVideosResponse> {
    const search = new URLSearchParams();
    if (options.includeSubgroups) {
        search.set('include_subgroups', 'true');
    }
    const qs = search.toString();
    const path = `/api/v1/groups/${encodeURIComponent(String(groupId))}/youtube/videos${qs ? `?${qs}` : ''}`;
    return apiGet<GroupYouTubeVideosResponse>(path, { signal: options.signal });
}

/**
 * POST /api/v1/youtube/editor-sessions
 *
 * Mint (or re-use, thanks to the FindOrCreateEditableSession helper
 * + partial UNIQUE index in InstaeditLogin) the editor session for a
 * specific (workspace, account, youtube_video_id) triple. The SPA only
 * calls this as the FALLBACK path when a card row has no editor_url
 * yet (we'd rather open the existing session silently).
 *
 * workspace_id is taken from the authenticated user context server-side,
 * but we still pass it explicitly to keep the contract observable
 * from the network panel.
 */
export async function createYouTubeEditorSession(
    payload: CreateYouTubeEditorSessionRequest,
): Promise<CreateYouTubeEditorSessionResponse> {
    return apiPost<CreateYouTubeEditorSessionResponse>(
        '/api/v1/youtube/editor-sessions',
        payload,
    );
}

export const youtubeGroupsApi = {
    listGroupYouTubeVideos,
    createYouTubeEditorSession,
} as const;

// ------------------------------------------------------------------
// Editor session read (live-update extension) — P1#6 surface for the
// post-publish short-poll + the BroadcastChannel listener.
// Mirrors the dark_editor's BFF wrapper so the two halves of the
// SPA share the same shape (and the same InstaeditLogin DTO).
// ------------------------------------------------------------------

export interface EditorSessionDetail {
    id: string;
    workspace_id: number;
    platform_account_id: number;
    youtube_video_id: string;
    velox_project_id: string;
    source_thumbnail_url?: string;
    thumbnail_media_id?: string | null;
    desired_privacy: string;
    publish_at?: string | null;
    status: string;
    last_error?: string;
    actual_privacy?: string | null;
    youtube_sync_status?: string | null;
    youtube_updated_at?: string | null;
    created_at: string;
    updated_at: string;
}

export async function getEditorSessionByProject(
    veloxProjectId: string,
    options: { signal?: AbortSignal } = {},
): Promise<EditorSessionDetail> {
    return apiGet<EditorSessionDetail>(
        `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}`,
        { signal: options.signal },
    );
}
