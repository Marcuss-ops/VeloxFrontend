// web/src/components/Ansible/BundleInfoPanel/sections.tsx —
// Section components extracted from BundleInfoPanel.tsx (commit 1 of the
// BundleInfoPanel refactor). Provides two internal sub-components used
// heavily throughout the bundle analytics UI:
//
//   - SectionBadge: small status pill (ok / warning / error / unknown)
//     rendered as a small chip with an icon, label, and optional detail
//     parenthetical. Used ~14 times across the panel for runtime, deps,
//     tests, and health-check rows.
//
//   - SectionCard: collapsible card wrapper that pairs a header button
//     (icon + title + collapse chevron) with optional children content.
//     Used ~8 times across the panel for structure / deps / venv / tests /
//     health / changelog sections.
//
// Both are pure presentational components — no hooks, no state, no store
// imports. All data flows in via props (label + status + detail for the
// badge; title + icon + iconColor + collapsed + onToggle + children for
// the card).
//
// The status color + icon lookup tables were inlined in the original file;
// they are extracted here as module-level const Maps for grep-ability and
// to make the status vocabulary (ok | warning | error | unknown) explicit
// as a type alias `SectionStatus`.

import React from 'react';

export type SectionStatus = 'ok' | 'warning' | 'error' | 'unknown';

const SECTION_STATUS_COLORS: Record<SectionStatus, string> = {
    ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const SECTION_STATUS_ICONS: Record<SectionStatus, string> = {
    ok: 'check_circle',
    warning: 'warning',
    error: 'cancel',
    unknown: 'help',
};

export interface SectionBadgeProps {
    label: string;
    status: SectionStatus;
    detail?: string;
}

export const SectionBadge: React.FC<SectionBadgeProps> = ({ label, status, detail }) => (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${SECTION_STATUS_COLORS[status]}`}>
        <span className="material-symbols-rounded text-[14px]">{SECTION_STATUS_ICONS[status]}</span>
        <span>{label}</span>
        {detail && <span className="opacity-70">({detail})</span>}
    </div>
);

export interface SectionCardProps {
    title: string;
    icon: string;
    iconColor: string;
    children: React.ReactNode;
    collapsed?: boolean;
    onToggle?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
    title,
    icon,
    iconColor,
    children,
    collapsed = false,
    onToggle,
}) => (
    <div className="bg-card-dark border border-border-dark rounded-xl overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-2">
                <span className={`material-symbols-rounded ${iconColor}`}>{icon}</span>
                <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
            </div>
            <span className={`material-symbols-rounded text-text-muted transition-transform ${collapsed ? '' : 'rotate-180'}`}>
                expand_more
            </span>
        </button>
        {!collapsed && (
            <div className="px-4 pb-4 border-t border-border-dark/50">
                {children}
            </div>
        )}
    </div>
);
