/**
 * WorkersAnsibleView — Workers monitor + Ansible deployment view.
 *
 * Simplified: always-visible tabs (no hover-reveal), lazy-loaded content.
 */

import React, { Suspense, lazy } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Cpu, Terminal } from 'lucide-react';

type WorkersAnsibleTab = 'workers' | 'ansible';

const TABS = [
    { id: 'workers' as const, label: 'Monitor', icon: Cpu },
    { id: 'ansible' as const, label: 'Ansible', icon: Terminal },
];

const WorkersDashboardApp = lazy(() =>
    import('../../components/Workers/WorkersDashboardApp').then(m => ({ default: m.WorkersDashboardApp }))
);
const AnsibleDashboardApp = lazy(() =>
    import('../../components/Ansible/AnsibleDashboardApp').then(m => ({ default: m.AnsibleDashboardApp }))
);

const LoadingFallback: React.FC = () => (
    <div className="flex justify-center p-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

const WorkersAnsibleView: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const activeTab = (params.get('tab') as WorkersAnsibleTab) || 'workers';

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* Tab bar — always visible */}
            <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.id}
                            to={`/workers-ansible?tab=${tab.id}`}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {/* Content */}
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'workers' && <WorkersDashboardApp />}
                {activeTab === 'ansible' && <AnsibleDashboardApp />}
            </Suspense>
        </div>
    );
};

export default WorkersAnsibleView;
