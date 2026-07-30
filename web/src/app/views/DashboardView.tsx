/**
 * DashboardView — InstaEdit groups list landing page.
 *
 * Replaces the old PanoramaApp analytics dashboard.
 * Shows clickable group cards linking to /groups/:id/videos.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    Sparkles, 
    Folder, 
    ArrowRight, 
    AlertCircle, 
    FolderClosed 
} from 'lucide-react';
import { listGroups, type GroupSummary } from '@/lib/api/youtubeGroupsApi';

// ---- Skeleton --------------------------------------------------------------

const SkeletonCard: React.FC = () => (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="h-5 w-32 rounded bg-white/10" />
    </div>
);

// ---- Card ------------------------------------------------------------------

const GroupCard: React.FC<{ group: GroupSummary }> = ({ group }) => (
    <Link
        to={`/groups/${group.id}/videos`}
        className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/[0.04] hover:shadow-lg hover:shadow-purple-500/5 active:scale-[0.99]"
    >
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/15 to-violet-500/15 flex items-center justify-center ring-1 ring-purple-500/20 group-hover:ring-purple-500/30 transition-all">
                <Folder className="size-5 text-purple-400" />
            </div>
            <span className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                {group.name}
            </span>
        </div>
        <ArrowRight className="size-4 text-slate-600 group-hover:text-purple-400 transition-colors group-hover:translate-x-0.5 transition-transform" />
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
            <div className="mb-10 text-center">
                <div className="relative inline-flex mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center ring-1 ring-purple-500/25">
                        <Sparkles className="size-7 text-purple-400" />
                    </div>
                    <div className="absolute -inset-1 bg-purple-500/10 rounded-3xl blur-md" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    InstaEdit
                </h1>
                <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto">
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
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/20">
                        <AlertCircle className="size-6 text-red-400" />
                    </div>
                    <p className="text-sm text-red-300">
                        Impossibile caricare i gruppi. Riprova più tardi.
                    </p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && data && data.groups.length === 0 && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                    <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
                        <FolderClosed className="size-7 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">
                        Nessun gruppo disponibile.
                    </p>
                </div>
            )}

            {/* Groups list */}
            {!isLoading && !isError && data && data.groups.length > 0 && (
                <div className="space-y-2.5">
                    {data.groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardView;
