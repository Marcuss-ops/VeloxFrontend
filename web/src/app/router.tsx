/**
 * Router — InstaEdit (Groups + Dark Editor only)
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from './shell/Navbar';
import { AppProviders } from './providers/AppProviders';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { APP_ROUTES } from './routes';
import { listGroups, type GroupSummary } from '@/lib/api/youtubeGroupsApi';

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

/** Landing page — lists available groups */
const LandingPage: React.FC = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['groups'],
        queryFn: listGroups,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className="max-w-4xl mx-auto p-6 pt-8">
            <div className="text-center mb-10">
                <span className="material-symbols-rounded text-5xl" style={{ color: '#c084fc' }}>
                    auto_awesome
                </span>
                <h1 className="text-2xl font-bold text-white mt-3">InstaEdit</h1>
                <p className="text-sm text-white/50 mt-1">
                    Seleziona un gruppo per modificare le thumbnail dei tuoi video YouTube.
                </p>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            )}

            {error && (
                <div className="text-center py-10">
                    <p className="text-red-400 text-sm">
                        Impossibile caricare i gruppi. Riprova più tardi.
                    </p>
                </div>
            )}

            {data?.groups && data.groups.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.groups.map((group: GroupSummary) => (
                        <Link
                            key={group.id}
                            to={`${APP_ROUTES.groupsVideosBase}/${group.id}/videos`}
                            className="block p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-rounded text-purple-400">
                                        folder
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                                        {group.name}
                                    </p>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        Modifica video &bull; Thumbnail
                                    </p>
                                </div>
                                <span className="material-symbols-rounded text-white/30 group-hover:text-white/60 ml-auto transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {data?.groups && data.groups.length === 0 && (
                <div className="text-center py-10">
                    <span className="material-symbols-rounded text-4xl text-white/20 mb-2 block">
                        folder_off
                    </span>
                    <p className="text-sm text-white/40">
                        Nessun gruppo disponibile. Contatta l&apos;amministratore.
                    </p>
                </div>
            )}
        </div>
    );
};

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
