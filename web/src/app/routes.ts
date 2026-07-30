export const APP_ROUTES = {
    home: '/dashboard-channels',
    dashboard: '/dashboard-channels',
    content: '/content',
    calendar: '/calendar',
    workersAnsible: '/workers-ansible',
    analytics: '/analytics',
    drive: '/drive',
    jobDetail: '/jobs/detail',
    contentJobDetail: '/jobs',
    /**
     * /groups/:groupId/videos — the per-group YouTube video card grid
     * (P0 one-click flow). The card click handler routes through
     * editor_url (preferred) or POST /editor-sessions (fallback).
     */
    groupsVideosBase: '/groups',
} as const;

/**
 * Legacy redirects — old routes mapped to new canonical paths.
 * Applied via router.tsx as Navigate components.
 */
export const LEGACY_REDIRECTS: { from: string; to: keyof typeof APP_ROUTES }[] = [
    { from: '/creator_studio_app', to: 'dashboard' },
    { from: '/creator_studio_app/*', to: 'dashboard' },
    { from: '/studio', to: 'dashboard' },
    { from: '/dashboard', to: 'dashboard' },
    { from: '/overview', to: 'dashboard' },
    { from: '/panorama', to: 'dashboard' },
    { from: '/finance', to: 'dashboard' },
    { from: '/workers', to: 'workersAnsible' },
    { from: '/workers/dashboard', to: 'workersAnsible' },
    { from: '/ansible_computers', to: 'workersAnsible' },
    { from: '/drive/explorer', to: 'drive' },
    { from: '/analytics/dashboard', to: 'analytics' },
];
