export const APP_ROUTES = {
    home: '/content',
    content: '/content',
    calendar: '/calendar',
    workersAnsible: '/workers-ansible',
    analytics: '/analytics',
    drive: '/drive',
    jobDetail: '/jobs/detail',
    contentJobDetail: '/jobs',
} as const;

/**
 * Legacy redirects — old routes mapped to new canonical paths.
 * Applied via router.tsx as Navigate components.
 */
export const LEGACY_REDIRECTS: { from: string; to: keyof typeof APP_ROUTES }[] = [
    { from: '/creator_studio_app', to: 'content' },
    { from: '/creator_studio_app/*', to: 'content' },
    { from: '/studio', to: 'content' },
    { from: '/dashboard', to: 'content' },
    { from: '/dashboard-channels', to: 'content' },
    { from: '/overview', to: 'content' },
    { from: '/panorama', to: 'content' },
    { from: '/finance', to: 'content' },
    { from: '/workers', to: 'workersAnsible' },
    { from: '/workers/dashboard', to: 'workersAnsible' },
    { from: '/ansible_computers', to: 'workersAnsible' },
    { from: '/drive/explorer', to: 'drive' },
    { from: '/analytics/dashboard', to: 'analytics' },
];
