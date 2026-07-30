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
    FolderClosed,
    RefreshCw
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
        className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03] active:scale-[0.99]"
    >
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Folder className="size-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-white/80 group-hover:text-primary transition-colors">
                {group.name}
            </span>
        </div>
        <ArrowRight className="size-4 text-white/20 group-hover:text-primary transition-colors" />
    </Link>
);

// ---- View ------------------------------------------------------------------

const DashboardView: React.FC = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: () => listGroups(),
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });

    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                        <Sparkles className="size-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white/90">
                            InstaEdit
                        </h1>
                        <p className="text-sm text-white/40">
                            Seleziona un gruppo per modificare le thumbnail
                        </p>
                    </div>
                </div>
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
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-8 text-center">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="size-6 text-red-400" />
                    </div>
                    <p className="text-sm text-red-400/80 mb-4 max-w-xs mx-auto leading-relaxed">
                        Impossibile caricare i gruppi. Il server potrebbe non essere raggiungibile.
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors border border-red-500/20"
                    >
                        <RefreshCw className="size-3.5" />
                        Riprova
                    </button>
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
                <div className="grid grid-cols-1 gap-2">
                    {data.groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardView;
