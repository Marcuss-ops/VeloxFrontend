import React, { useState } from 'react';
import { useAnsibleComputers } from './AnsibleComputersTab/hooks/useAnsibleComputers';
import { AnsibleComputersTab } from './AnsibleComputersTab/AnsibleComputersTab';
import { AnsibleShellTab } from './AnsibleShellTab';
import { BundleExplorer } from './BundleExplorer';
import { AnsibleOperationProgress } from './AnsibleOperationProgress';

// Skeleton
const SkeletonRow = () => (
    <div className="flex items-center gap-3 py-3 animate-pulse">
        <div className="size-10 rounded-lg bg-white/5 shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/5 rounded w-2/3" />
            <div className="h-2 bg-white/5 rounded w-1/3" />
        </div>
        <div className="h-6 w-16 bg-white/5 rounded-full" />
    </div>
);

// KPI Card Component
interface KpiCardProps {
    title: string;
    value: number | string;
    icon: string;
    trend?: 'up' | 'down' | 'neutral';
    color: 'primary' | 'success' | 'warning' | 'error';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => {
    const colorStyles = {
        primary: 'from-violet-500/20 to-pink-500/20 border-violet-500/30',
        success: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
        warning: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
        error: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    };

    const iconColors = {
        primary: 'text-violet-400',
        success: 'text-emerald-400',
        warning: 'text-amber-400',
        error: 'text-red-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorStyles[color]} border rounded-2xl p-4`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
                <span className={`material-symbols-rounded ${iconColors[color]} text-[28px]`}>{icon}</span>
            </div>
        </div>
    );
};

export const AnsibleDashboardApp: React.FC = () => {
    const { computers, runs, loading, error, refresh } = useAnsibleComputers(30000);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [externalRun, setExternalRun] = useState<{ runId: string; action: string; targets: string[] } | null>(null);

    // Tab state: 'bundle' | 'computers' - read from URL path or default to 'bundle'
    const getInitialTab = (): 'bundle' | 'computers' => {
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path.includes('/ansible_computers/bundle')) return 'bundle';
            if (path.includes('/ansible_computers/computers')) return 'computers';
        }
        return 'bundle';
    };
    const [activeTab, setActiveTab] = useState<'bundle' | 'computers'>(getInitialTab());

    // Update URL when tab changes
    const handleTabChange = (tab: 'bundle' | 'computers') => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            const newUrl = tab === 'bundle' ? '/ansible_computers/bundle' : '/ansible_computers/computers';
            window.history.pushState({}, '', newUrl);
        }
    };

    const handleRunStarted = (runId: string, action: string, targets: string[]) => {
        setExternalRun({ runId, action, targets });
    };

    const clearExternalRun = () => {
        setExternalRun(null);
    };


    // Calculate KPIs
    const totalComputers = computers.length;
    const availableComputers = computers.filter(c => c.availability === 'AVAILABLE').length;
    const unavailableComputers = computers.filter(c => c.availability === 'UNAVAILABLE').length;
    const linkedWorkers = computers.filter(c => c.linked_worker_id).length;

    return (
        <div className="h-full max-w-[1440px] mx-auto w-full px-6 py-8 flex flex-col">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                        Ansible Computers
                    </h1>
                    <p className="text-text-secondary mt-1 text-sm">Gestione e monitoraggio infrastruttura server</p>
                </div>
                <div className="flex items-center gap-4">
                    {error ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400">
                            <span className="size-2 rounded-full bg-red-500" />
                            Connessione persa
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-dark text-xs font-medium text-text-secondary">
                            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                            System Online
                        </div>
                    )}
                    <button
                        onClick={refresh}
                        className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors group"
                        title="Aggiorna dati"
                    >
                        <span className={`material-symbols-rounded group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}>
                            sync
                        </span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard title="Totale Computer" value={totalComputers} icon="dns" color="primary" />
                <KpiCard title="Disponibili" value={availableComputers} icon="check_circle" color="success" />
                <KpiCard title="Non Disponibili" value={unavailableComputers} icon="cancel" color="error" />
                <KpiCard title="Worker Collegati" value={linkedWorkers} icon="link" color="warning" />
            </div>

            <p className="text-sm text-text-secondary mb-2">
                Nell&apos;infrastruttura sono presenti <strong className="text-white">10 computer</strong>; in elenco sono mostrati quelli configurati nel backend ({totalComputers}).
            </p>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-6 border-b border-border-dark pb-4">
                <button
                    onClick={() => handleTabChange('bundle')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'bundle'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                >
                    <span className="material-symbols-rounded">inventory_2</span>
                    <span>Bundle Ansible</span>
                </button>
                <button
                    onClick={() => handleTabChange('computers')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'computers'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                >
                    <span className="material-symbols-rounded">dns</span>
                    <span>Ansible Computers</span>
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/10">{totalComputers}</span>
                </button>
            </div>

            {/* Content Area - Tab Based */}
            <div className="flex-1 overflow-auto scrollbar-hide">
                {loading ? (
                    <div className="space-y-4 pt-4">
                        {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
                    </div>
                ) : (
                    <>
                        {/* ================================ */}
                        {/* TAB 1: BUNDLE ANSIBLE */}
                        {/* ================================ */}
                        {activeTab === 'bundle' && (
                            <section className="animate-fadeIn space-y-4">
                                <p className="text-sm text-text-secondary">
                                    Il <strong className="text-white">bundle</strong> è il pacchetto (ZIP) distribuito ai computer Ansible per eseguire i job. Qui puoi esplorarne il contenuto e rigenerarlo se necessario.
                                </p>
                                <BundleExplorer />
                            </section>
                        )}

                        {/* ================================ */}
                        {/* TAB 2: ANSIBLE COMPUTERS */}
                        {/* ================================ */}
                        {activeTab === 'computers' && (
                            <section className="space-y-8 animate-fadeIn">
                                {/* Shell Terminal */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-rounded text-primary">terminal</span>
                                        <h3 className="text-lg font-semibold text-text-primary">Comandi SSH</h3>
                                    </div>
                                    <AnsibleShellTab
                                        computers={computers}
                                        selectedIds={selected}
                                        runs={runs}
                                        onRefresh={refresh}
                                        externalRun={externalRun}
                                        onExternalRunConsumed={clearExternalRun}
                                    />
                                </div>

                                {/* Computers Grid */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-rounded text-primary">dns</span>
                                        <h3 className="text-lg font-semibold text-text-primary">Computer ed Azioni</h3>
                                    </div>
                                    <AnsibleComputersTab
                                        computers={computers}
                                        onRefresh={refresh}
                                        selected={selected}
                                        setSelected={setSelected}
                                        onRunStarted={handleRunStarted}
                                    />
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Modern Operation Progress Modal */}
            <AnsibleOperationProgress
                isVisible={externalRun !== null}
                action={externalRun?.action || ''}
                targets={externalRun?.targets || []}
                runId={externalRun?.runId || null}
                runs={runs}
                onClose={clearExternalRun}
                onRefresh={refresh}
            />
        </div>
    );
};
