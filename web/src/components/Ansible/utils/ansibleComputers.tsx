import React, { useState } from 'react';
import { AnsibleComputer, AnsibleComputerAvailability } from '../types';

export function formatRelativeTime(isoString: string): string {
    if (!isoString) return 'Mai';
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
}

export function AvailabilityDot({ availability, busy }: { availability: AnsibleComputerAvailability; busy?: boolean }) {
    const colors: Record<string, string> = {
        AVAILABLE: '#10b981',
        UNAVAILABLE: '#ef4444',
        BUSY: '#f59e0b',
        UNKNOWN: '#64748b',
    };

    let status: string = availability;
    if (availability === 'AVAILABLE' && busy) status = 'BUSY';

    const color = colors[status as any] ?? colors.UNKNOWN;

    return (
        <div className="relative flex items-center justify-center">
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px 2px ${color}66`,
                }}
            />
            {(status === 'AVAILABLE' || status === 'BUSY') && (
                <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: color }}
                />
            )}
        </div>
    );
}

const cardBaseStyle: React.CSSProperties = {
    background: 'rgba(15, 15, 20, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '14px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
};

export function getCardStyle(hovered: boolean, selected: boolean) {
    return {
        ...cardBaseStyle,
        borderColor: selected
            ? 'rgba(139, 92, 246, 0.5)'
            : hovered
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.05)',
        boxShadow: selected
            ? '0 0 0 1px rgba(139, 92, 246, 0.3), 0 8px 16px -4px rgba(0,0,0,0.3)'
            : (hovered ? '0 10px 20px -10px rgba(0, 0, 0, 0.5)' : cardBaseStyle.boxShadow),
        background: (hovered || selected) ? 'rgba(255, 255, 255, 0.03)' : cardBaseStyle.background,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0px)',
    } as React.CSSProperties;
}

export function ComputerCard({
    computer,
    selected,
    onToggle,
    onDelete,
}: {
    computer: AnsibleComputer;
    selected: boolean;
    onToggle: () => void;
    onDelete: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    const isBusy = !!(computer.last_run_id && computer.last_run_rc === undefined);
    const isOffline = computer.availability === 'UNAVAILABLE';

    let statusLabel = 'Online';
    let statusColor = 'text-emerald-400';
    if (isOffline) {
        statusLabel = 'Offline';
        statusColor = 'text-red-400';
    } else if (isBusy) {
        statusLabel = 'Busy';
        statusColor = 'text-amber-400';
    }

    return (
        <div
            style={getCardStyle(hovered, selected)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onToggle}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AvailabilityDot availability={computer.availability} busy={isBusy} />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        color: '#f8fafc',
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {computer.id || computer.host}
                    </div>
                    <div style={{
                        color: '#94a3b8',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        opacity: 0.8,
                    }}>
                        {computer.host}
                    </div>
                </div>

                <div className={`text-[10px] font-bold uppercase tracking-widest ${statusColor} opacity-80 shrink-0`}>
                    {statusLabel}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 12 }}>person</span>
                    {computer.ansible_user || 'root'}
                </div>
                <div style={{ fontSize: 10, color: '#475569' }}>
                    {formatRelativeTime(computer.last_seen_at)}
                </div>
            </div>

            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                background: '#8b5cf6',
                opacity: selected ? 1 : 0,
                transition: 'opacity 0.2s'
            }} />

            {hovered && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 2,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>close</span>
                </button>
            )}
        </div>
    );
}

export interface ActionConfig {
    label: string;
    color: string;
    textColor: string;
    icon: string;
    title: string;
}

export const ACTION_CONFIG: Record<string, ActionConfig> = {
    preflight_workers: { label: 'Preflight', color: 'rgba(59,130,246,', textColor: '#60a5fa', icon: 'flight_takeoff', title: 'SSH ping, disk, Python/ffmpeg, worker status. Esegui prima di Update.' },
    update_workers: { label: 'Update', color: 'rgba(139,92,246,', textColor: '#a78bfa', icon: 'upgrade', title: 'Aggiorna codice sui computer selezionati' },
    install_workers: { label: 'Full Install', color: 'rgba(16,185,129,', textColor: '#34d399', icon: 'build', title: 'Reinstallazione completa worker sui computer selezionati' },
    restart_workers: { label: 'Reboot', color: 'rgba(239,68,68,', textColor: '#f87171', icon: 'power_settings_new', title: 'Riavvia i computer selezionati' },
    check_workers: { label: 'Check', color: 'rgba(234,179,8,', textColor: '#fbbf24', icon: 'checklist', title: 'Verifica stato worker' },
    remove_workers: { label: 'Remove', color: 'rgba(239,68,68,', textColor: '#f87171', icon: 'delete', title: 'Rimuovi worker dai computer selezionati' },
};

export const VISIBLE_ACTIONS = new Set(['update_workers', 'install_workers']);
