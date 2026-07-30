import React, { useState, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
    Cpu, 
    Terminal 
} from 'lucide-react';

type WorkersAnsibleTab = 'workers' | 'ansible';

const TABS = [
    { id: 'workers', label: 'Monitor', icon: Cpu },
    { id: 'ansible', label: 'Ansible', icon: Terminal },
];

const WorkersDashboardApp = lazy(() => import('../../components/Workers/WorkersDashboardApp').then(m => ({ default: m.WorkersDashboardApp })));
const AnsibleDashboardApp = lazy(() => import('../../components/Ansible/AnsibleDashboardApp').then(m => ({ default: m.AnsibleDashboardApp })));

const LoadingFallback: React.FC = () => (
    <div className="flex justify-center p-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

export const WorkersAnsibleView: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const activeTab = params.get('tab') as WorkersAnsibleTab || 'workers';
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="h-full flex flex-col min-h-0 bg-[#020617] relative">
            {/* HOVER SENSITIVE AREA */}
            <div 
                className="absolute top-0 left-0 w-full h-20 z-40"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />

            {/* COMPACT ICON NAVIGATION - HOVER TO REVEAL */}
            <div 
                className={`
                    flex items-center justify-center py-4 px-6 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl
                    fixed top-[56px] left-0 right-0 z-50 transition-all duration-300 ease-in-out
                    ${isHovered ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
                `}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.id}
                                to={`/workers-ansible?tab=${tab.id}`}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                                    ${isActive 
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                                    }
                                `}
                            >
                                <Icon size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 min-h-0 overflow-auto">
                <div className="p-6">
                    <Suspense fallback={<LoadingFallback />}>
                        {activeTab === 'workers' && <WorkersDashboardApp />}
                        {activeTab === 'ansible' && <AnsibleDashboardApp />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default WorkersAnsibleView;
