import React, { useState } from 'react';
import { filterJobsByStatus } from './jobUtils';
import { WorkersTabs } from './WorkersTabs';
import { WorkersQueueTab } from './WorkersQueueTab';
import { WorkersExecutionTab } from './WorkersExecutionTab';
import { WorkersCompletedTab } from './WorkersCompletedTab';
import { WorkersErrorsTab } from './WorkersErrorsTab';
import { useJobsData } from './useJobsData';
import { WorkersTab } from './types';

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

interface WorkersDashboardAppProps {
    initialTab?: WorkersTab;
    onTabChange?: (tab: WorkersTab) => void;
}

export const WorkersDashboardApp: React.FC<WorkersDashboardAppProps> = ({ initialTab, onTabChange }) => {
    const [activeTab, setActiveTab] = useState<WorkersTab>(() => {
        if (initialTab) return initialTab;
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        return (['coda', 'esecuzione', 'completati', 'errori'].includes(t ?? '') ? t : 'coda') as WorkersTab;
    });

    const { jobs, workersMap, loading, error, refresh } = useJobsData(10000);

    const pending = filterJobsByStatus(jobs, 'PENDING');
    const running = filterJobsByStatus(jobs, 'PROCESSING');
    const done = filterJobsByStatus(jobs, 'COMPLETED').sort((a, b) =>
        String(b.completed_at ?? b.updated_at ?? '').localeCompare(String(a.completed_at ?? a.updated_at ?? ''))
    );
    const errors = filterJobsByStatus(jobs, 'ERROR', 'FAILED').sort((a, b) =>
        String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
    );

    const handleTabChange = (tab: WorkersTab) => {
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    return (
        <div className="h-full max-w-[1440px] mx-auto w-full px-6 py-8 flex flex-col">
            {/* Page header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                        Dashboard Workers
                    </h1>
                    <p className="text-text-secondary mt-1 text-sm">Monitoraggio real-time dello stato del sistema</p>
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

            {/* Tabs */}
            <WorkersTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                counts={{ coda: pending.length, esecuzione: running.length, errori: errors.length }}
            />

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="space-y-4 pt-4">
                        {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
                    </div>
                ) : (
                    <>
                        {activeTab === 'coda' && <WorkersQueueTab jobs={pending} onRefresh={refresh} />}
                        {activeTab === 'esecuzione' && <WorkersExecutionTab jobs={running} workersMap={workersMap} onRefresh={refresh} />}
                        {activeTab === 'completati' && <WorkersCompletedTab jobs={done} />}
                        {activeTab === 'errori' && <WorkersErrorsTab jobs={errors} onRefresh={refresh} />}
                    </>
                )}
            </div>
        </div>
    );
};
