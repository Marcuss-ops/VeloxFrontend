import React from 'react';
import { ListMusic, Settings2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { WorkersTab } from './types';

interface TabDef {
    key: WorkersTab;
    label: string;
    icon: React.ElementType;
    badgeKey?: keyof Counts;
}

interface Counts {
    coda: number;
    esecuzione: number;
    errori: number;
}

const TABS: TabDef[] = [
    { key: 'coda', label: 'Coda', icon: ListMusic, badgeKey: 'coda' },
    { key: 'esecuzione', label: 'Esecuzione', icon: Settings2 },
    { key: 'completati', label: 'Completati', icon: CheckCircle2 },
    { key: 'errori', label: 'Errori', icon: AlertTriangle, badgeKey: 'errori' },
];

interface WorkersTabsProps {
    activeTab: WorkersTab;
    onTabChange: (tab: WorkersTab) => void;
    counts: Counts;
}

export const WorkersTabs: React.FC<WorkersTabsProps> = ({ activeTab, onTabChange, counts }) => {
    const Icon = TABS.find(t => t.key === activeTab)?.icon;
    return (
        <div className="mb-8 border-b border bg-black/20">
            <div className="flex gap-8 overflow-x-auto">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    const count = tab.badgeKey ? counts[tab.badgeKey] : 0;
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className="relative pb-4 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors duration-200"
                            style={{ color: isActive ? '#fff' : '#94a3b8' }}
                        >
                            <TabIcon className="size-[18px]" />
                            {tab.label}
                            {count > 0 && (
                                <span className="bg-card text-white text-[10px] px-1.5 py-0.5 rounded ml-1">
                                    {count}
                                </span>
                            )}
                            {/* Active indicator */}
                            {isActive && (
                                <span
                                    className="absolute bottom-0 left-0 w-full h-0.5 rounded-full"
                                    style={{
                                        background: 'linear-gradient(90deg, hsl(7 78% 53%), hsl(7 78% 40%))',
                                        boxShadow: '0 -2px 10px hsla(7, 78%, 53%, 0.5)',
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
