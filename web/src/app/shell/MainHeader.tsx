import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../providers/I18nProvider';
import { useAuth } from '../providers/AuthProvider';
import { Activity, LayoutGrid, CalendarDays, MonitorPlay, Construction, Edit } from 'lucide-react';
import { APP_ROUTES } from '../routes';

const NAV_LINKS = [
    { href: APP_ROUTES.dashboard, label: 'Dashboard', icon: LayoutGrid },
    { href: APP_ROUTES.calendar, label: 'Calendario', icon: CalendarDays },
    { href: APP_ROUTES.youtubeSuite, label: 'YouTube', icon: MonitorPlay },
    { href: APP_ROUTES.workersAnsible, label: 'Workers', icon: Construction },
    { href: APP_ROUTES.creatorStudio, label: 'Studio', icon: Edit },
];

export const MainHeader: React.FC = () => {
    const { locale, setLocale } = useI18n();
    const { user } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => {
        const base = path.split('?')[0];
        return location.pathname === base || location.pathname.startsWith(`${base}/`);
    };

    return (
        <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-2 backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                    <Activity className="text-purple-400 size-6" />
                    <span className="text-sm font-black tracking-tighter text-slate-100">VELOX <span className="text-purple-500">LEGIT</span></span>
                </div>
                
                <nav className="flex items-center gap-6">
                    {NAV_LINKS.map(link => {
                        const Icon = link.icon;
                        const active = isActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                to={link.href}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                    active ? 'text-purple-400' : 'text-slate-500 hover:text-slate-200'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="hidden xl:inline">{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 pr-4 border-r border-white/10 text-slate-500">
                    <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer hover:text-purple-400 transition-colors"
                    >
                        <option value="it" className="bg-slate-900">IT</option>
                        <option value="en" className="bg-slate-900">EN</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase hidden sm:block">{user.name}</span>
                    <div className="size-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-px">
                        <div className="size-full rounded-full bg-slate-950 flex items-center justify-center text-[9px] font-black text-white uppercase">
                            {user.name.slice(0, 2)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
