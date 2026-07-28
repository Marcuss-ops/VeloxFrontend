/**
 * DTO types mirroring the InstaeditLogin backend response for
 * GET /api/v1/groups/{group_id}/youtube/videos
 * (pkg/api/youtube_group_videos.go on the Go side).
 *
 * Field names use snake_case (the BFF serializer maps directly to the
 * Go struct tags, no transformation). Each card on the SPA dashboard
 * renders one GroupYouTubeVideoEntry.
 */

export type GroupYouTubeVideoPrivacyStatus = 'private' | 'unlisted' | 'public';

export type GroupYouTubeVideoEditorStatus =
    | 'editing'
    | 'ready'
    | 'publishing'
    | 'published'
    | 'failed';

export type GroupYouTubeVideoSyncStatus = 'confirmed' | 'unconfirmed';

export interface GroupYouTubeVideoEntry {
    youtube_video_id: string;
    title: string;
    thumbnail_url: string;
    privacy_status: GroupYouTubeVideoPrivacyStatus;
    processing_status: string;
    platform_account_id: number;
    channel_name: string;
    /** Present when an editor session already exists for this video. */
    editor_session_id?: string;
    /** Present when an editor session already exists for this video. */
    velox_project_id?: string;
    /** Pre-minted editor URL (server-side editorURLForProject). */
    editor_url?: string;
    /** "ready" when no session exists yet (operator hasn't opened). */
    editor_status: GroupYouTubeVideoEditorStatus;
    desired_privacy?: GroupYouTubeVideoPrivacyStatus;
    /** PLACEHOLDER today; reconciler will overwrite to live YouTube value. */
    actual_privacy?: GroupYouTubeVideoPrivacyStatus;
    youtube_sync_status?: GroupYouTubeVideoSyncStatus;
    /**
     * Phantom entry — synthesized server-side from a session row
     * whose matching YouTube video was filtered out of
     * ListEditableVideos (typically because the operator published
     * the video as `public`, which the YouTube query excludes).
     * The thumbnail URL points to YouTube's public CDN so the
     * operator still gets a visual signal; the title may differ
     * from the live YouTube title if the operator edited it on
     * YouTube Studio since the publish. UI hint: the badge stack
     * ("Pubblico" + "Pubblicato") already conveys the state; no
     * special rendering needed.
     */
    phantom?: boolean;
}

export interface GroupYouTubeVideosResponse {
    videos: GroupYouTubeVideoEntry[];
    /** Per-account YouTube list failures (graceful degradation). */
    warnings?: string[];
}

/**
 * Request body for POST /api/v1/youtube/editor-sessions — used as the
 * fallback mint path when the card row has no editor_url yet (the SPA
 * calls this BEFORE the first Navigation to the Dark Editor so the
 * operator always lands at /editor/{velox_project_id}).
 */
export interface CreateYouTubeEditorSessionRequest {
    workspace_id: number;
    platform_account_id: number;
    youtube_video_id: string;
    source_thumbnail_url?: string;
}

export interface CreateYouTubeEditorSessionResponse {
    session_id: string;
    velox_project_id: string;
    editor_url: string;
}
