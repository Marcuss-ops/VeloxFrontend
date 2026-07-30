/**
 * ContentDetailView — /content/:contentId
 *
 * Layout wrapper for a specific content project.
 * Renders a tab bar and an <Outlet /> for nested subroutes.
 */

import React, { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParams, Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { APP_ROUTES } from '@/app/routes';

const LoadingView: React.FC = () => (
    <div className="space-y-3 p-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
    </div>
);

const SUB_TABS = [
    { to: 'script', icon: 'article', label: 'Script' },
    { to: 'voiceover', icon: 'record_voice_over', label: 'Voiceover' },
    { to: 'media', icon: 'folder', label: 'Media' },
    { to: 'publish', icon: 'publish', label: 'Pubblica' },
] as const;

export const ContentDetailView: React.FC = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const location = useLocation();

    // If visiting the bare /:contentId without a tab, redirect to script
    const baseUrl = `${APP_ROUTES.content}/${contentId}`;
    if (location.pathname === baseUrl) {
        return <Navigate to={`${baseUrl}/script`} replace />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    to={APP_ROUTES.content}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="size-[18px] " />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Contenuto {contentId?.slice(0, 8)}...
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Gestione contenuto</p>
                </div>
            </div>

            {/* Sub-navigation tabs */}
            <nav className="flex gap-1 border-b border pb-2">
                {SUB_TABS.map((tab) => {
                    const tabUrl = `${baseUrl}/${tab.to}`;
                    const isActive = location.pathname === tabUrl;
                    return (
                        <Link
                            key={tab.to}
                            to={tabUrl}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                                isActive
                                    ? 'bg-purple-600/20 text-purple-300'
                                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-rounded text-base">{tab.icon}</span>
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Nested subroute content */}
            <Suspense fallback={<LoadingView />}>
                <Outlet />
            </Suspense>
        </div>
    );
};

export default ContentDetailView;
