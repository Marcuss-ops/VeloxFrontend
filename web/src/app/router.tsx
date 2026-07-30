/**
 * Router — InstaEdit (Groups + Dark Editor only)
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './shell/Navbar';
import { AppProviders } from './providers/AppProviders';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { APP_ROUTES } from './routes';

// Lazy-loaded views
const GroupsView = lazy(() => import('./views/GroupsView'));

// Loading fallback
const LoadingView: React.FC = () => (
    <div className="space-y-3 p-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
    </div>
);

/** App Shell — wraps all routes with navbar and main layout */
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

/** Simple landing page */
const LandingPage: React.FC = () => (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center space-y-4">
            <span className="material-symbols-rounded text-5xl" style={{ color: '#c084fc' }}>
                auto_awesome
            </span>
            <h1 className="text-2xl font-bold text-white">InstaEdit</h1>
            <p className="text-sm text-white/50">Seleziona un gruppo per iniziare a modificare i tuoi video.</p>
        </div>
    </div>
);

export const router = createBrowserRouter([
    {
        element: <AppShell />,
        children: [
            // --- Groups (per-group video card grid) ---
            {
                path: `${APP_ROUTES.groupsVideosBase}/:groupId/videos`,
                element: (
                    <ErrorBoundary>
                        <GroupsView />
                    </ErrorBoundary>
                )
            },

            // --- Home — landing page ---
            {
                path: '/',
                element: <LandingPage />
            },

            // --- 404 fallback ---
            {
                path: '*',
                element: <Navigate to="/" replace />
            }
        ]
    }
]);

export const AppRouter: React.FC = () => {
    return (
        <AppProviders>
            <RouterProvider router={router} />
        </AppProviders>
    );
};

export default router;
