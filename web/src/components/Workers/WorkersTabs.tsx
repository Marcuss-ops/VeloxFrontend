import React from 'react';
import { WorkersTab } from './types';

interface TabDef {
    key: WorkersTab;
    label: string;
    icon: string;
    badgeKey?: keyof Counts;
}

interface Counts {
    coda: number;
    esecuzione: number;
    errori: number;
}

const TABS: TabDef[] = [
    { key: 'coda', label: 'Coda', icon: 'queue_music', badgeKey: 'coda' },
    { key: 'esecuzione', label: 'Esecuzione', icon: 'settings_suggest' },
    { key: 'completati', label: 'Completati', icon: 'check_circle' },
    { key: 'errori', label: 'Errori', icon: 'warning', badgeKey: 'errori' },
];

interface WorkersTabsProps {
    activeTab: WorkersTab;
    onTabChange: (tab: WorkersTab) => void;
    counts: Counts;
}

export const WorkersTabs: React.FC<WorkersTabsProps> = ({ activeTab, onTabChange, counts }) => (
    <div className="mb-8 border-b border-border-dark bg-background-dark/50">
        <div className="flex gap-8 overflow-x-auto">
            {TABS.map(tab => {
                const isActive = activeTab === tab.key;
                const count = tab.badgeKey ? counts[tab.badgeKey] : 0;
                return (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className="relative pb-4 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors duration-200"
                        style={{ color: isActive ? '#fff' : '#94a3b8' }}
                    >
                        <span className="material-symbols-rounded text-[18px]">{tab.icon}</span>
                        {tab.label}
                        {count > 0 && (
                            <span className="bg-surface text-text-primary text-[10px] px-1.5 py-0.5 rounded ml-1">
                                {count}
                            </span>
                        )}
                        {/* Active indicator */}
                        {isActive && (
                            <span
                                className="absolute bottom-0 left-0 w-full h-0.5 rounded-full"
                                style={{
                                    background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                                    boxShadow: '0 -2px 10px rgba(139,92,246,0.5)',
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    </div>
);
