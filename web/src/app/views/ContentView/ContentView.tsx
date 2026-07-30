/**
 * ContentView — InstaEdit content management shell.
 *
 * Wraps all /content subroutes with a consistent layout.
 */

import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

const LoadingView: React.FC = () => (
    <div className="space-y-3 p-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
    </div>
);

export const ContentView: React.FC = () => {
    return (
        <div className="h-full min-h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border bg-background/30 shadow-2xl">
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

export default ContentView;
