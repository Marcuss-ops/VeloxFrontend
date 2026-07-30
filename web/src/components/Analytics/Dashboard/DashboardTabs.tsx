import React from 'react';
import { 
    ListOrdered, 
    PlayCircle, 
    CheckCircle2, 
    AlertCircle, 
    Code2, 
    BarChart3 
} from 'lucide-react';
import { DashboardTab, DashboardCounts } from './types';

interface DashboardTabsProps {
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
    counts: DashboardCounts;
}

const tabs: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: 'coda', label: 'Coda', icon: ListOrdered },
    { id: 'esecuzione', label: 'Esecuzione', icon: PlayCircle },
    { id: 'completati', label: 'Completati', icon: CheckCircle2 },
    { id: 'errori', label: 'Errori', icon: AlertCircle },
    { id: 'api', label: 'API', icon: Code2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange, counts }) => {
    return (
        <div className="flex items-center gap-1 mb-6 p-1 bg-card/60 rounded-xl border border">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tab.id === 'coda' ? counts.coda : tab.id === 'esecuzione' ? counts.esecuzione : tab.id === 'errori' ? counts.errori : 0;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${isActive
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:text-foreground/80 hover:bg-white/5'
                            }
                        `}
                    >
                        <Icon className="size-[18px]" />
                        <span>{tab.label}</span>
                        {count > 0 && (
                            <span className={`
                                ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${isActive ? 'bg-primary text-white' : 'bg-muted text-foreground/70'}
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
