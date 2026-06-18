import React, { useState, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
    CloudUpload, 
    Users, 
    Radio, 
    LayoutDashboard, 
    ExternalLink
} from 'lucide-react';

type YouTubeSuiteTab = 'upload' | 'orchestrator' | 'channels' | 'livestream' | 'content_manager' | 'dark_editor';

const TABS = [
    { id: 'upload', label: 'Upload', icon: CloudUpload },
    { id: 'orchestrator', label: 'Orchestrator', icon: LayoutDashboard },
    { id: 'channels', label: 'Canali', icon: Users },
    { id: 'livestream', label: 'Live', icon: Radio },
    { id: 'content_manager', label: 'Manager', icon: ExternalLink },
    { id: 'dark_editor', label: 'Editor', icon: ExternalLink },
];

const YouTubeUploadApp = lazy(() => import('../../components/YouTubeManager/YouTubeUploadApp').then(m => ({ default: m.YouTubeUploadApp })));
const YouTubeOrchestrator = lazy(() => import('../../components/YouTubeManager/YouTubeOrchestrator').then(m => ({ default: m.YouTubeOrchestrator })));
const YouTubeChannelsApp = lazy(() => import('../../components/YouTubeManager/YouTubeChannelsApp').then(m => ({ default: m.YouTubeChannelsApp })));
const YouTubeLivestreamApp = lazy(() => import('../../components/YouTubeManager/YouTubeLivestreamApp').then(m => ({ default: m.YouTubeLivestreamApp })));
const YouTubeManagerApp = lazy(() => import('../../components/YouTubeManagerApp').then(m => ({ default: m.YouTubeManagerApp })));
const DARK_EDITOR_URL = (import.meta.env.VITE_DARK_EDITOR_URL ?? '/dark_editor_v2').replace(/\/+$/, '');

const LoadingFallback: React.FC = () => (
    <div className="flex justify-center p-12">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

export const YouTubeSuiteView: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const activeTab = params.get('tab') as YouTubeSuiteTab || 'orchestrator';
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

                        if (tab.id === 'dark_editor') {
                            return (
                                <a
                                    key={tab.id}
                                    href={DARK_EDITOR_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
                                    title="Dark Editor"
                                >
                                    <Icon size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={tab.id}
                                to={`/youtube-suite?tab=${tab.id}`}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                                    ${isActive 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
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
                        {activeTab === 'upload' && <YouTubeUploadApp />}
                        {activeTab === 'orchestrator' && <YouTubeOrchestrator />}
                        {activeTab === 'channels' && <YouTubeChannelsApp />}
                        {activeTab === 'livestream' && <YouTubeLivestreamApp />}
                        {activeTab === 'content_manager' && <YouTubeManagerApp />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default YouTubeSuiteView;
