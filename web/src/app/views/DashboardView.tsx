/**
 * DashboardView — InstaEdit groups list landing page.
 *
 * Replaces the old PanoramaApp analytics dashboard.
 * Shows clickable group cards linking to /groups/:id/videos.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listGroups, type GroupSummary } from '@/lib/api/youtubeGroupsApi';

// ---- Skeleton --------------------------------------------------------------

const SkeletonCard: React.FC = () => (
    <div className="animate-pulse rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div className="h-5 w-32 rounded bg-white/10" />
    </div>
);

// ---- Card ------------------------------------------------------------------

const GroupCard: React.FC<{ group: GroupSummary }> = ({ group }) => (
    <Link
        to={`/groups/${group.id}/videos`}
        className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.04]"
    >
        <div className="flex items-center gap-4">
            <span
                className="material-symbols-rounded text-2xl text-purple-400"
                style={{ fontSize: 28 }}
            >
                folder
            </span>
            <span className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                {group.name}
            </span>
        </div>
        <span
            className="material-symbols-rounded text-lg text-slate-600 group-hover:text-purple-400 transition-colors"
            style={{ fontSize: 20 }}
        >
            arrow_forward
        </span>
    </Link>
);

// ---- View ------------------------------------------------------------------

const DashboardView: React.FC = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['groups'],
        queryFn: () => listGroups(),
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
            {/* Header */}
            <div className="mb-8 text-center">
                <span
                    className="material-symbols-rounded mb-3 inline-block text-purple-400"
                    style={{ fontSize: 40 }}
                >
                    auto_awesome
                </span>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                    InstaEdit
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Seleziona un gruppo per modificare le thumbnail dei tuoi video YouTube.
                </p>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                    <span
                        className="material-symbols-rounded mb-2 text-2xl text-red-400"
                        style={{ fontSize: 28 }}
                    >
                        error
                    </span>
                    <p className="text-sm text-red-300">
                        Impossibile caricare i gruppi. Riprova più tardi.
                    </p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && data && data.groups.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                    <span
                        className="material-symbols-rounded mb-3 text-3xl text-slate-600"
                        style={{ fontSize: 32 }}
                    >
                        folder_off
                    </span>
                    <p className="text-sm text-slate-500">
                        Nessun gruppo disponibile.
                    </p>
                </div>
            )}

            {/* Groups list */}
            {!isLoading && !isError && data && data.groups.length > 0 && (
                <div className="space-y-3">
                    {data.groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardView;
