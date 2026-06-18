import React, { useState, useEffect } from 'react';
import { ScriptTabApp } from './tabs/ScriptTabApp';
import { VoiceoverTabApp } from './tabs/VoiceoverTabApp';
import { ClipTabApp } from './tabs/ClipTabApp';
import { StockTabApp } from './tabs/StockTabApp';
import { DriveLinksTabApp } from './tabs/DriveLinksTabApp';
import { NavBar } from '../ui/tubelight-navbar';
import { FileText, Mic, Video, Image, Link } from 'lucide-react';

type TabType = 'script' | 'voiceover' | 'clip' | 'stock' | 'drivelinks';
const VALID_TABS: TabType[] = ['script', 'voiceover', 'clip', 'stock', 'drivelinks'];

const TAB_ITEMS: { id: TabType; name: string; icon: typeof FileText }[] = [
    { id: 'script', name: 'SCRIPT', icon: FileText },
    { id: 'voiceover', name: 'MULTI-VOICE', icon: Mic },
    { id: 'clip', name: 'CLIP', icon: Video },
    { id: 'stock', name: 'STOCK', icon: Image },
    { id: 'drivelinks', name: 'DRIVE LINKS', icon: Link },
];

export const CreatorStudioApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('script');
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const syncTabFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab') as TabType;
            if (tab && VALID_TABS.includes(tab)) {
                setActiveTab(tab);
            }
        };

        syncTabFromUrl();

        const handleTabChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            const newTab = customEvent.detail?.tab as TabType;
            if (newTab && VALID_TABS.includes(newTab)) {
                setActiveTab(newTab);
            }
        };

        const handlePopState = () => syncTabFromUrl();

        window.addEventListener('studio-tab-change', handleTabChange);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('studio-tab-change', handleTabChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({}, '', url);
    }, [activeTab]);

    const renderTab = () => {
        switch (activeTab) {
            case 'script':
                return <ScriptTabApp />;
            case 'voiceover':
                return <VoiceoverTabApp />;
            case 'clip':
                return <ClipTabApp />;
            case 'stock':
                return <StockTabApp />;
            case 'drivelinks':
                return <DriveLinksTabApp />;
            default:
                return <ScriptTabApp />;
        }
    };

    const handleTabChange = (tabName: string) => {
        const tabItem = TAB_ITEMS.find(t => t.name === tabName);
        if (tabItem) {
            setActiveTab(tabItem.id);
        }
    };

    const activeTabName = TAB_ITEMS.find(t => t.id === activeTab)?.name || 'SCRIPT';

    return (
        <div className="min-h-screen relative bg-[#020617]">
            {/* HOVER SENSITIVE AREA */}
            <div 
                className="absolute top-0 left-0 w-full h-16 z-40"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />

            {/* UNIFIED NAVBAR - HOVER TO REVEAL */}
            <div 
                className={`
                    fixed top-[56px] left-0 right-0 z-50 transition-all duration-300 ease-in-out py-4 bg-slate-950/60 backdrop-blur-xl border-b border-white/5
                    ${isHovered ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
                `}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="w-full max-w-7xl mx-auto px-4">
                    <NavBar
                        items={TAB_ITEMS.map(t => ({ name: t.name, icon: t.icon }))}
                        activeTab={activeTabName}
                        onTabChange={handleTabChange}
                    />
                </div>
            </div>

            <div className="pt-2">
                {renderTab()}
            </div>
        </div>
    );
};
