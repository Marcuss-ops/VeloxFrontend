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
const JobDetailView = lazy(() => import('./views/JobDetailView'));
const VeloxJobDetailView = lazy(() => import('./views/VeloxJobDetailView'));
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
        <div className="flex flex-col h-screen overflow-hidden w-full bg-background">
            <Navbar />
            <main id="main-scroll-container" className="flex-1 overflow-auto min-w-0 pt-12">
                <Suspense fallback={<LoadingView />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

/**
 * Router configuration
 * 
 * Primary routes (canonical paths, one per view):
 *   /content             → Content (main entry)
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
                element: <Navigate to={APP_ROUTES.content} replace />,
            },

            // --- 404 fallback ---
            {
                path: '*',
                element: <Navigate to={APP_ROUTES.content} replace />
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
