/**
 * Unified Router Configuration
 * 
 * AGENT 13D - Routing e State Unificati
 * 
 * Centralizza tutta la navigazione dell'applicazione in un unico punto.
 * Elimina la logica di routing dispersa in main.tsx.
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useParams } from 'react-router-dom';

// Shell components
import { Navbar } from './shell/Navbar';
import { AppProviders } from './providers/AppProviders';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { APP_ROUTES, LEGACY_REDIRECTS } from './routes';

// Lazy-loaded views
const DashboardView = lazy(() => import('./views/DashboardView'));
const JobDetailView = lazy(() => import('./views/JobDetailView'));
const VeloxJobDetailView = lazy(() => import('./views/VeloxJobDetailView'));
const GroupsView = lazy(() => import('./views/GroupsView'));
const CalendarView = lazy(() => import('./views/CalendarView').then(async m => {
    const { CalendarErrorBoundary } = await import('./views/CalendarView/CalendarErrorBoundary');
    return {
        default: () => (
            <CalendarErrorBoundary>
                <m.CalendarView />
            </CalendarErrorBoundary>
        )
    };
}));
const WorkersAnsibleView = lazy(() => import('./views/WorkersAnsibleView'));
// Lazy-loaded apps (wrapping named exports as default for lazy loading)
const AnalyticsDashboardApp = lazy(() => import('../components/Analytics/Dashboard/DashboardApp').then(m => ({ default: m.DashboardApp })));
const DriveFileExplorer = lazy(() => import('../components/Drive/DriveFileExplorer').then(m => ({ default: m.DriveFileExplorer })));

// Content views (InstaEdit)
const ContentView = lazy(() => import('./views/ContentView/ContentView'));
const ContentDashboard = lazy(() => import('./views/ContentView/ContentDashboard'));
const NewContentWizard = lazy(() => import('./views/ContentView/NewContentWizard'));
const ContentDetailView = lazy(() => import('./views/ContentView/ContentDetailView'));
const ScriptWorkspace = lazy(() => import('./views/ContentView/ScriptWorkspace'));
const VoiceoverWorkspace = lazy(() => import('./views/ContentView/VoiceoverWorkspace'));
const MediaLibrary = lazy(() => import('./views/ContentView/MediaLibrary'));
const PublishView = lazy(() => import('./views/ContentView/PublishView'));

// Loading fallback
const LoadingView: React.FC = () => (
    <div className="space-y-3 p-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
    </div>
);

/** Redirect /velox/jobs/:jobId → /jobs/:jobId (legacy, temporary) */
const VeloxJobRedirect: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    return <Navigate to={`${APP_ROUTES.contentJobDetail}/${jobId}`} replace />;
};

/**
 * App Shell - wraps all routes with navbar and main layout
 */
const AppShell: React.FC = () => {
    return (
        <div className="flex flex-col h-screen overflow-hidden w-full">
            <Navbar />
            <main id="main-scroll-container" className="flex-1 overflow-auto min-w-0 pt-[56px]">
                <Suspense fallback={<LoadingView />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

/**
 * Dashboard Shell - wraps dashboard views with header
 */
const DashboardShell: React.FC = () => {
    return (
        <div className="h-full min-h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30 shadow-2xl">
            <div className="flex h-full min-h-0 flex-col">
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <Suspense fallback={<LoadingView />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

/**
 * Router configuration
 * 
 * Primary routes (canonical paths, one per view):
 *   /dashboard-channels  → Dashboard (main entry)
 *   /content             → Content (InstaEdit)
 *   /calendar            → Calendar
 *   /workers-ansible     → Workers + Ansible
 *   /analytics           → Analytics Dashboard
 *   /drive               → Drive Explorer
 *   /jobs/detail/:jobId  → Job Detail
 */
export const router = createBrowserRouter([
    {
        element: <AppShell />,
        children: [
            // --- Dashboard ---
            {
                path: APP_ROUTES.dashboard,
                element: <DashboardShell />,
                children: [
                    { index: true, element: <DashboardView /> },
                ]
            },

            // --- Calendar ---
            {
                path: APP_ROUTES.calendar,
                element: <CalendarView />
            },

            // --- Workers + Ansible ---
            {
                path: APP_ROUTES.workersAnsible,
                element: <WorkersAnsibleView />
            },

            // --- Analytics Dashboard ---
            {
                path: APP_ROUTES.analytics,
                element: <AnalyticsDashboardApp />
            },

            // --- Drive Explorer ---
            {
                path: APP_ROUTES.drive,
                element: <DriveFileExplorer />
            },

            // --- Content (InstaEdit) ---
            {
                path: APP_ROUTES.content,
                element: <ContentView />,
                children: [
                    { index: true, element: <ContentDashboard /> },
                    { path: 'new', element: <NewContentWizard /> },
                    {
                        path: ':contentId',
                        element: <ContentDetailView />,
                        children: [
                            { index: true, element: null },
                            { path: 'script', element: <ScriptWorkspace /> },
                            { path: 'voiceover', element: <VoiceoverWorkspace /> },
                            { path: 'media', element: <MediaLibrary /> },
                            { path: 'publish', element: <PublishView /> },
                        ],
                    },
                ]
            },

            // --- Job Detail ---
            {
                path: `${APP_ROUTES.jobDetail}/:jobId`,
                element: <JobDetailView />
            },

            // --- Content Job Detail (formerly Velox) ---
            {
                path: `${APP_ROUTES.contentJobDetail}/:jobId`,
                element: <VeloxJobDetailView />
            },

            // --- Groups (per-group video card grid for P0 one-click) ---
            {
                path: `${APP_ROUTES.groupsVideosBase}/:groupId/videos`,
                element: (
                    <ErrorBoundary>
                        <GroupsView />
                    </ErrorBoundary>
                )
            },

            // --- Legacy redirects (temporary — driven by LEGACY_REDIRECTS) ---
            ...LEGACY_REDIRECTS.map(({ from, to }) => ({
                path: from,
                element: <Navigate to={APP_ROUTES[to]} replace />,
            })),

            // --- Legacy: /velox/jobs → /jobs (preserves :jobId, temporary) ---
            {
                path: '/velox/jobs/:jobId',
                element: <VeloxJobRedirect />,
            },

            // --- Default redirect ---
            {
                path: '/',
                element: <DashboardShell />,
                children: [
                    { index: true, element: <DashboardView /> },
                ]
            },

            // --- 404 fallback ---
            {
                path: '*',
                element: <Navigate to={APP_ROUTES.dashboard} replace />
            }
        ]
    }
]);

/**
 * App Router component
 */
export const AppRouter: React.FC = () => {
    return (
        <AppProviders>
            <RouterProvider router={router} />
        </AppProviders>
    );
};

export default router;
