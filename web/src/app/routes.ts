export const APP_ROUTES = {
    /**
     * /groups/:groupId/videos — the per-group YouTube video card grid.
     * The card click handler routes through editor_url (preferred)
     * or POST /editor-sessions (fallback) to open the Dark Editor.
     */
    groupsVideosBase: '/groups',
} as const;
