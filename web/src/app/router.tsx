/**
 * Unified Router Configuration
 * 
 * AGENT 13D - Routing e State Unificati
 * 
 * Centralizza tutta la navigazione dell'applicazione in un unico punto.
 * Elimina la logica di routing dispersa in main.tsx.
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';

// Shell components
import { Navbar } from './shell/Navbar';
import { AppProviders } from './providers/AppProviders';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { APP_ROUTES } from './routes';

// Lazy-loaded views
const DashboardView = lazy(() => import('./views/DashboardView'));
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
const CreatorStudioApp = lazy(() => import('../components/Script/CreatorStudioApp').then(m => ({ default: m.CreatorStudioApp })));
const AnalyticsDashboardApp = lazy(() => import('../components/Analytics/Dashboard/DashboardApp').then(m => ({ default: m.DashboardApp })));
const DriveFileExplorer = lazy(() => import('../components/Drive/DriveFileExplorer').then(m => ({ default: m.DriveFileExplorer })));

// Loading fallback
const LoadingView: React.FC = () => (
    <div className="space-y-3 p-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
    </div>
);

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
 *   /calendar            → Calendar
 *   /workers-ansible     → Workers + Ansible
 *   /creator_studio_app  → Creator Studio
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

            // --- Creator Studio ---
            {
                path: APP_ROUTES.creatorStudio,
                element: (
                    <ErrorBoundary>
                        <CreatorStudioApp />
                    </ErrorBoundary>
                )
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

            // --- Job Detail ---
            {
                path: `${APP_ROUTES.jobDetail}/:jobId`,
                element: <JobDetailView />
            },

            // --- Velox Job Detail ---
            {
                path: `${APP_ROUTES.veloxJobDetail}/:jobId`,
                element: <VeloxJobDetailView />
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
