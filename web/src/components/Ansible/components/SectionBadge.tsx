import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

type BadgeStatus = 'ok' | 'warning' | 'error' | 'unknown';

interface SectionBadgeProps {
    label: string;
    status: BadgeStatus;
    detail?: string;
}

const statusColors: Record<BadgeStatus, string> = {
    ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusIcons: Record<BadgeStatus, React.ElementType> = {
    ok: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle,
    unknown: HelpCircle,
};

export const SectionBadge: React.FC<SectionBadgeProps> = ({ label, status, detail }) => {
    const Icon = statusIcons[status];
    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${statusColors[status]}`}>
            <Icon className="size-3.5" />
            <span>{label}</span>
            {detail && <span className="opacity-70">({detail})</span>}
        </div>
    );
};

export default SectionBadge;
