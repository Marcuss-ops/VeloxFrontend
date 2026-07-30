/**
 * DashboardView — Bento Grid layout.
 *
 * Design system: SaaS Modern Dark Dashboard
 * - Hero header with contextual greeting + CTA
 * - Stat cards row (metriche chiave)
 * - Dashed placeholder cards per upsell/espansione
 * - Groups section con grid 3-colonne + placeholder "Aggiungi gruppo"
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
    RefreshCw,
    Plus,
    Users,
    Youtube,
    LayoutGrid,
} from 'lucide-react';
import { listGroups, type GroupSummary } from '@/lib/api/youtubeGroupsApi';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03] ${className}`}
    >
        <div className="p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-white/8" />
            <div className="h-7 w-14 rounded bg-white/10" />
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Stat Card
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, trend }) => (
    <div className="group rounded-xl border border-white/[0.06] bg-card p-5 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.02]">
        <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Icon className="size-[18px] text-primary" />
            </div>
            {trend && (
                <span className="text-[11px] font-medium text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    {trend}
                </span>
            )}
        </div>
        <p className="text-2xl font-bold text-white/90 tracking-tight tabular-nums">
            {value}
        </p>
        <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Dashed placeholder card (Bento Grid empty state pattern)
// ─────────────────────────────────────────────────────────────────────────────

interface DashedCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

const DashedCard: React.FC<DashedCardProps> = ({ icon: Icon, title, description }) => (
    <button className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/8 bg-white/[0.015] p-6 transition-all duration-200 hover:border-primary/25 hover:bg-primary/[0.025] active:scale-[0.98] w-full cursor-pointer" onClick={() => {}}>
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center group-hover:border-primary/25 group-hover:bg-primary/10 transition-all duration-200">
            <Plus className="size-5 text-white/25 group-hover:text-primary transition-colors duration-200" />
        </div>
        <div className="text-center">            <p className="text-sm font-medium text-white/45 group-hover:text-white/65 transition-colors duration-200">
                        {title}
                    </p>
                    <p className="text-[11px] text-white/25 mt-1 max-w-[160px] leading-relaxed">
                        {description}
                    </p>
                </div>
            </button>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Group Card
// ─────────────────────────────────────────────────────────────────────────────

const GroupCard: React.FC<{ group: GroupSummary }> = ({ group }) => (
    <Link
        to={`/groups/${group.id}/videos`}
        className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03] hover:ring-1 hover:ring-primary/30 active:scale-[0.98]"
    >
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                <Folder className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
                <span className="text-sm font-medium text-white/80 truncate block group-hover:text-primary transition-colors">
                    {group.name}
                </span>
                {group.parent_group_id && (
                    <span className="text-[10px] text-white/25 mt-0.5 block">Sottogruppo</span>
                )}
            </div>
        </div>
        <ArrowRight className="size-4 text-white/20 group-hover:text-primary transition-colors shrink-0 ml-2" />
    </Link>
);

// ─────────────────────────────────────────────────────────────────────────────
//  View
// ─────────────────────────────────────────────────────────────────────────────

const DashboardView: React.FC = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: () => listGroups(),
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });

    const groups = data?.groups ?? [];
    const groupCount = groups.length;

    /* ── Loading ─────────────────────────────────────────── */

    if (isLoading) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-10">
                {/* Hero skeleton */}
                <div className="mb-10">
                    <SkeletonBlock className="h-20" />
                </div>
                {/* Stats row skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                    <SkeletonBlock className="h-24" />
                    <SkeletonBlock className="h-24" />
                    <SkeletonBlock className="h-24" />
                </div>
                {/* Groups skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonBlock key={i} className="h-16" />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error ────────────────────────────────────────────── */

    if (isError) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="rounded-xl border border-red-500/15 bg-red-500/[0.02] p-12 text-center">
                    <div className="w-14 h-14 rounded-xl bg-red-500/8 flex items-center justify-center mx-auto mb-5 ring-1 ring-red-500/20">
                        <AlertCircle className="size-7 text-red-400/80" />
                    </div>
                    <p className="text-sm text-red-400/70 mb-6 max-w-xs mx-auto leading-relaxed">
                        Impossibile caricare i gruppi.
                        <br />
                        Il server potrebbe non essere raggiungibile.
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all border border-red-500/15 active:scale-[0.97]"
                    >
                        <RefreshCw className="size-3.5" />
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    /* ── Content ─────────────────────────────────────────── */

    return (
        <div className="mx-auto max-w-5xl px-4 py-10">
            {/* ═══════════════════════════════════════════════════════
                 HERO  (full-width)
                 ═══════════════════════════════════════════════════════ */}
            <div className="mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Sparkles className="size-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white/90">
                                {getGreeting()} 👋
                            </h1>
                            <p className="text-sm text-white/40 mt-0.5">
                                {groupCount > 0
                                    ? `${groupCount} ${groupCount === 1 ? 'gruppo caricato' : 'gruppi caricati'} — cosa c'è in programma oggi?`
                                    : 'Collega un canale YouTube per iniziare'}
                            </p>
                        </div>
                    </div>

                    <button
                        title="Prossimamente"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:brightness-110 transition-all active:scale-[0.97] shrink-0 shadow-[0_0_16px_-6px] shadow-primary/40"
                    >
                        <Plus className="size-4" />
                        Nuovo gruppo
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                 STATS ROW  (3-col Bento grid, 2-col tablet, 1-col mobile)
                 ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                <StatCard
                    icon={Users}
                    label="Gruppi totali"
                    value={groupCount}
                    trend={groupCount > 0 ? 'Attivo' : undefined}
                />
                <StatCard
                    icon={Youtube}
                    label="Canali collegati"
                    value={groupCount > 0 ? '—' : '0'}
                />
                <DashedCard
                    icon={Plus}
                    title="Collega un canale YouTube"
                    description="Aggiungi un account YouTube per gestire le thumbnail"
                />
            </div>

            {/* ═══════════════════════════════════════════════════════
                 GROUPS SECTION  (Bento grid 3-colonne)
                 ═══════════════════════════════════════════════════════ */}
            <div>
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <LayoutGrid className="size-4 text-white/30" />
                        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                            I tuoi gruppi
                        </h2>
                        {groupCount > 0 && (
                            <span className="text-[11px] font-medium text-white/25 bg-white/5 px-2 py-0.5 rounded-full tabular-nums">
                                {groupCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-white/25">
                        {groupCount === 1 ? '1 gruppo' : `${groupCount} gruppi`}
                    </span>
                </div>

                {/* ── Empty state ── */}
                {groupCount === 0 ? (
                    <div className="rounded-xl border border-white/[0.06] bg-card p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4 ring-1 ring-white/8">
                            <FolderClosed className="size-7 text-white/25" />
                        </div>
                        <p className="text-sm text-white/35 mb-6 max-w-sm mx-auto leading-relaxed">
                            Nessun gruppo disponibile.
                            <br />
                            Collegati a un canale YouTube per iniziare.
                        </p>
                        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:brightness-110 transition-all active:scale-[0.97] shadow-[0_0_16px_-6px] shadow-primary/40">
                            <Plus className="size-4" />
                            Collega un canale
                        </button>
                    </div>
                ) : (
                    /* ── Groups grid ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groups.map((group) => (
                            <GroupCard key={group.id} group={group} />
                        ))}
                        <DashedCard
                            icon={Plus}
                            title="Aggiungi gruppo"
                            description="Crea un nuovo gruppo di canali YouTube"
                        />
                    </div>
                )}
            </div>

            {/* Footer spacer */}
            <div className="mt-12 text-center">
                <p className="text-[11px] text-white/15">
                    InstaEdit &mdash; Thumbnail Automation
                </p>
            </div>
        </div>
    );
};

export default DashboardView;
