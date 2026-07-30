import React, { useState } from 'react';
import { AnsibleComputer, ActionCapability } from '../types';
import { runAnsibleAction, testAnsibleSSH, deleteAnsibleComputer, useCapabilities } from './hooks/useAnsibleComputers';
import { ComputerList } from './components/ComputerList';
import { ComputerForm } from './components/ComputerForm';

interface AnsibleComputersTabProps {
    computers: AnsibleComputer[];
    onRefresh: () => void;
    selected: Set<string>;
    setSelected: (s: Set<string>) => void;
    onRunStarted?: (runId: string, action: string, targets: string[]) => void;
}

// Action button configuration (maps action names to UI properties)
const ACTION_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: string; title: string }> = {
    preflight_workers: { label: 'Preflight', color: 'rgba(59,130,246,', textColor: '#60a5fa', icon: 'flight_takeoff', title: 'SSH ping, disk, Python/ffmpeg, worker status. Esegui prima di Update.' },
    update_workers: { label: 'Update', color: 'rgba(139,92,246,', textColor: '#a78bfa', icon: 'upgrade', title: 'Aggiorna codice sui computer selezionati' },
    install_workers: { label: 'Full Install', color: 'rgba(16,185,129,', textColor: '#34d399', icon: 'build', title: 'Reinstallazione completa worker sui computer selezionati' },
    restart_workers: { label: 'Reboot', color: 'rgba(239,68,68,', textColor: '#f87171', icon: 'power_settings_new', title: 'Riavvia i computer selezionati' },
    check_workers: { label: 'Check', color: 'rgba(234,179,8,', textColor: '#fbbf24', icon: 'checklist', title: 'Verifica stato worker' },
    remove_workers: { label: 'Remove', color: 'rgba(239,68,68,', textColor: '#f87171', icon: 'delete', title: 'Rimuovi worker dai computer selezionati' },
};

const VISIBLE_ACTIONS = new Set(['update_workers', 'install_workers']);

export const AnsibleComputersTab: React.FC<AnsibleComputersTabProps> = ({ computers, onRefresh, selected, setSelected, onRunStarted }) => {
    // Capability-driven UI: fetch available actions from backend
    const { capabilities, error: capabilitiesError } = useCapabilities();
    const visibleCapabilities = React.useMemo(
        () => capabilities.filter((cap) => VISIBLE_ACTIONS.has(cap.name)),
        [capabilities]
    );

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingComputer, setEditingComputer] = useState<AnsibleComputer | null>(null);

    // Filter state
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGroup, setFilterGroup] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterTag, setFilterTag] = useState<string>('all');

    // Extract unique values for filters
    const uniqueGroups = React.useMemo(() => {
        const groups = new Set(computers.map(c => c.group).filter(Boolean));
        return Array.from(groups).sort();
    }, [computers]);

    const uniqueTags = React.useMemo(() => {
        const tags = new Set(computers.flatMap(c => c.tags || []).filter(Boolean));
        return Array.from(tags).sort();
    }, [computers]);

    // Sort computers by ID for stable positioning
    const sortedComputers = React.useMemo(() => {
        return [...computers].sort((a, b) => a.id.localeCompare(b.id));
    }, [computers]);

    // Apply filters
    const filteredComputers = React.useMemo(() => {
        return sortedComputers.filter(c => {
            const matchesSearch = searchQuery === '' ||
                c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.linked_worker_id?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesGroup = filterGroup === 'all' || c.group === filterGroup;

            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'online' && c.availability === 'AVAILABLE') ||
                (filterStatus === 'offline' && c.availability === 'UNAVAILABLE') ||
                (filterStatus === 'unknown' && c.availability === 'UNKNOWN');

            const matchesTag = filterTag === 'all' || (c.tags && c.tags.includes(filterTag));

            return matchesSearch && matchesGroup && matchesStatus && matchesTag;
        });
    }, [sortedComputers, searchQuery, filterGroup, filterStatus, filterTag]);

    const toggleSelect = (id: string) => {
        const s = new Set(selected);
        if (s.has(id)) {
            s.delete(id);
        } else {
            s.add(id);
        }
        setSelected(s);
    };

    const toggleSelectAll = () => {
        setSelected(selected.size === filteredComputers.length
            ? new Set()
            : new Set(filteredComputers.map(c => c.id))
        );
    };

    const handleAction = async (action: string) => {
        if (selected.size === 0) return;
        setActionLoading(action);
        try {
            const targets = Array.from(selected);
            const result = action === 'test_ssh'
                ? await testAnsibleSSH(targets)
                : await runAnsibleAction(action, targets);
            if (onRunStarted && result.run_id) {
                onRunStarted(result.run_id, action, targets);
            }
            onRefresh();
        } catch (e) {
            console.error('[ComputersTab] Action failed:', e);
            alert(`Azione fallita: ${e instanceof Error ? e.message : 'Errore sconosciuto'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Eliminare il computer ${id}?`)) return;
        try {
            await deleteAnsibleComputer(id);
            onRefresh();
        } catch (e) {
            alert(`Eliminazione fallita: ${e instanceof Error ? e.message : 'Errore sconosciuto'}`);
        }
    };

    const handleFormSaved = () => {
        setShowForm(false);
        setEditingComputer(null);
        onRefresh();
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingComputer(null);
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
        background: 'rgba(15,15,20,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        color: '#f8fafc',
        fontSize: 13,
        outline: 'none',
    };

    const selectStyle = (isDefault: boolean): React.CSSProperties => ({
        padding: '10px 32px 10px 12px',
        background: 'rgba(15,15,20,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        color: isDefault ? '#94a3b8' : '#f8fafc',
        fontSize: 13,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Add Computer Button */}
            {!showForm && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px',
                            background: 'rgba(139,92,246,0.15)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: 12,
                            color: '#a78bfa',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
                        Aggiungi Computer
                    </button>
                </div>
            )}

            {/* Computer Form (add/edit) */}
            {showForm && (
                <ComputerForm
                    editing={editingComputer}
                    onSaved={handleFormSaved}
                    onCancel={handleFormCancel}
                />
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Search & Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 auto' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 280 }}>
                        <span className="material-symbols-rounded" style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            color: '#475569', fontSize: 20, pointerEvents: 'none',
                        }}>search</span>
                        <input
                            type="text"
                            placeholder="Cerca computer..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {/* Group Filter */}
                    {uniqueGroups.length > 0 && (
                        <select
                            value={filterGroup}
                            onChange={e => setFilterGroup(e.target.value)}
                            style={selectStyle(filterGroup === 'all')}
                        >
                            <option value="all">Tutti i gruppi</option>
                            {uniqueGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    )}

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={selectStyle(filterStatus === 'all')}
                    >
                        <option value="all">Tutti gli stati</option>
                        <option value="online">🟢 Online</option>
                        <option value="offline">🔴 Offline</option>
                        <option value="unknown">⚪ Sconosciuto</option>
                    </select>

                    {/* Tag Filter */}
                    {uniqueTags.length > 0 && (
                        <select
                            value={filterTag}
                            onChange={e => setFilterTag(e.target.value)}
                            style={selectStyle(filterTag === 'all')}
                        >
                            <option value="all">Tutti i tag</option>
                            {uniqueTags.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Select all + bulk actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>
                        <input
                            type="checkbox"
                            checked={selected.size === filteredComputers.length && filteredComputers.length > 0}
                            onChange={toggleSelectAll}
                            style={{ accentColor: '#8b5cf6' }}
                        />
                        Tutti
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Ansible status indicator */}
                        {capabilitiesError && (
                            <span style={{ fontSize: 10, color: '#ef4444', marginRight: 8 }} title={capabilitiesError}>
                                ⚠️ Ansible non disponibile
                            </span>
                        )}

                        {/* Dynamic action buttons from backend capabilities */}
                        {visibleCapabilities.map((cap: ActionCapability) => {
                            const config = ACTION_CONFIG[cap.name] || {
                                label: cap.name,
                                color: 'rgba(100,116,139,',
                                textColor: '#94a3b8',
                                icon: 'terminal',
                                title: cap.reason || cap.name,
                            };

                            const isDisabled = !cap.available || actionLoading !== null || selected.size === 0;
                            const isLoading = actionLoading === cap.name;

                            return (
                                <button
                                    key={cap.name}
                                    onClick={() => handleAction(cap.name)}
                                    disabled={isDisabled}
                                    title={cap.available ? (config.title ?? config.label) : (cap.reason || 'Non disponibile')}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 48, height: 48,
                                        background: isLoading ? 'rgba(255,255,255,0.1)' : `${config.color}0.1)`,
                                        border: `1px solid ${config.color}${cap.available ? '0.3' : '0.1'})`,
                                        borderRadius: '50%',
                                        color: cap.available ? config.textColor : '#475569',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        opacity: isDisabled ? 0.4 : 1,
                                        filter: !cap.available || selected.size === 0 ? 'grayscale(0.5)' : 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (isDisabled) return;
                                        e.currentTarget.style.background = `${config.color}0.2)`;
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (isDisabled) return;
                                        e.currentTarget.style.background = `${config.color}0.1)`;
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    {isLoading ? (
                                        <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span className="material-symbols-rounded" style={{ fontSize: 28 }}>{config.icon}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Cards grid */}
            <ComputerList
                computers={filteredComputers}
                selected={selected}
                onToggleSelect={toggleSelect}
                onDeleteComputer={handleDelete}
            />

            {/* Summary */}
            <div style={{ fontSize: 12, color: '#475569' }}>
                {filteredComputers.length} computer
                {selected.size > 0 && ` • ${selected.size} selezionat${selected.size === 1 ? 'o' : 'i'}`}
            </div>
        </div>
    );
};