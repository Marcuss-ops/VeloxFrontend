import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PanoramaApp } from '../../components/Panorama/PanoramaApp';
import { FinanceDashboardApp } from '../../components/Finance/FinanceDashboardApp';
import { LayoutDashboard, TrendingUp } from 'lucide-react';

type PanoramicaTab = 'panoramica' | 'revenue';

const TABS = [
    { id: 'panoramica', label: 'Overview', icon: LayoutDashboard },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
];

const DashboardView: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const panoramicaTab = params.get('tab') as PanoramicaTab || 'panoramica';
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="h-full flex flex-col bg-[#020617] relative">
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
                        const isActive = panoramicaTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.id}
                                to={`/dashboard-channels?tab=${tab.id}`}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                                    ${isActive 
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
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

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto p-6">
                {panoramicaTab === 'panoramica' && (
                    <PanoramaApp />
                )}
                {panoramicaTab === 'revenue' && (
                    <FinanceDashboardApp initialTab="revenue" />
                )}
            </div>
        </div>
    );
};

export default DashboardView;
