import React from 'react';
import { DashboardTab, DashboardCounts } from './types';

interface DashboardTabsProps {
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
    counts: DashboardCounts;
}

const tabs: { id: DashboardTab; label: string; icon: string }[] = [
    { id: 'coda', label: 'Coda', icon: 'queue' },
    { id: 'esecuzione', label: 'Esecuzione', icon: 'settings_suggest' },
    { id: 'completati', label: 'Completati', icon: 'check_circle' },
    { id: 'errori', label: 'Errori', icon: 'error' },
    { id: 'api', label: 'API', icon: 'api' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
];

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange, counts }) => {
    return (
        <div className="flex items-center gap-1 mb-6 p-1 bg-slate-900/60 rounded-xl border border-white/5">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tab.id === 'coda' ? counts.coda : tab.id === 'esecuzione' ? counts.esecuzione : tab.id === 'errori' ? counts.errori : 0;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${isActive
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }
                        `}
                    >
                        <span className="material-symbols-rounded text-[18px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                        {count > 0 && (
                            <span className={`
                                ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${isActive ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'}
                            `}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
