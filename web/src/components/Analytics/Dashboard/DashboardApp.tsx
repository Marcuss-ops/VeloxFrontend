import React from 'react';
import { Terminal, RefreshCw } from 'lucide-react';
import { useDashboardData } from './useDashboardData';
import { DashboardTabs } from './DashboardTabs';
import { DashboardQueueTab } from './DashboardQueueTab';
import { DashboardExecutionTab } from './DashboardExecutionTab';
import { DashboardCompletedTab } from './DashboardCompletedTab';
import { DashboardErrorsTab } from './DashboardErrorsTab';
import { DashboardApiTab } from './DashboardApiTab';
import { DashboardAnalyticsTab } from './DashboardAnalyticsTab';
import { DashboardTab } from './types';

// Loading skeleton
const SkeletonCard: React.FC = () => (
    <div className="animate-pulse rounded-xl border border-white/10 bg-slate-900/50 p-5">
        <div className="h-3 bg-white/5 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-white/5 rounded w-1/2"></div>
    </div>
);


interface DashboardAppProps {
    initialTab?: DashboardTab;
    onTabChange?: (tab: DashboardTab) => void;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({ initialTab = 'coda', onTabChange }) => {
    const {
        workersMap,
        apiSubmissions,
        loading,
        error,
        activeTab,
        setActiveTab,
        refresh,
        pending,
        running,
        completed,
        errors,
    } = useDashboardData(10000, initialTab);

    const handleTabChange = (tab: DashboardTab) => {
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    const counts = {
        coda: pending.length,
        esecuzione: running.length,
        errori: errors.length,
    };

    return (
        <div className="h-full flex flex-col">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1">Monitoraggio real-time dello stato del sistema</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Remote Showlog Link */}
                    <a
                        href="/showlog"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-medium text-slate-400 hover:text-purple-300 hover:border-purple-500/30 transition-colors"
                        title="Apri Showlog remoto: inserisci IP worker e vedi ultimi 500 log"
                    >
                        <Terminal className="size-4" />
                        Showlog remoto
                    </a>

                    {/* Connection Status */}
                    {error ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400">
                            <span className="size-2 rounded-full bg-red-500" />
                            Connessione persa
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10 text-xs font-medium text-slate-400">
                            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                            System Online
                        </div>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={refresh}
                        className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors group"
                        title="Aggiorna dati"
                    >
                        <RefreshCw className={`size-4 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <DashboardTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                counts={counts}
            />

            {/* Tab Contents */}
            <div className="flex-1 min-h-0 overflow-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <>
                        {activeTab === 'coda' && <DashboardQueueTab jobs={pending} onRefresh={refresh} />}
                        {activeTab === 'esecuzione' && <DashboardExecutionTab jobs={running} workersMap={workersMap} onRefresh={refresh} />}
                        {activeTab === 'completati' && <DashboardCompletedTab jobs={completed} />}
                        {activeTab === 'errori' && <DashboardErrorsTab jobs={errors} onRefresh={refresh} />}
                        {activeTab === 'api' && <DashboardApiTab submissions={apiSubmissions} onRefresh={refresh} />}
                        {activeTab === 'analytics' && <DashboardAnalyticsTab />}
                    </>
                )}
            </div>
        </div>
    );
};
