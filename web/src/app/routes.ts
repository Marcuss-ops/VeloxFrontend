export const APP_ROUTES = {
    home: '/dashboard-channels',
    dashboard: '/dashboard-channels',
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
