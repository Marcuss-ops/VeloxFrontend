export const APP_ROUTES = {
    home: '/dashboard-channels',
    dashboard: '/dashboard-channels',
    content: '/content',
    calendar: '/calendar',
    workersAnsible: '/workers-ansible',
    analytics: '/analytics',
    drive: '/drive',
    jobDetail: '/jobs/detail',
    veloxJobDetail: '/velox/jobs',
    /**
     * /groups/:groupId/videos — the per-group YouTube video card grid
     * (P0 one-click flow). The card click handler routes through
     * editor_url (preferred) or POST /editor-sessions (fallback).
     */
    groupsVideosBase: '/groups',
} as const;

/**
 * LEGACY_REDIRECTS — temporary redirects for old URLs.
 *
 * These are kept SEPARATE from APP_ROUTES to avoid polluting the
 * canonical route registry. Marked for removal once traffic to
 * these URLs drops to zero.
 *
 * Format: { from: string, to: keyof typeof APP_ROUTES }
 */
export const LEGACY_REDIRECTS = [
    { from: '/creator_studio_app/*', to: 'content' as const },
] as const;
