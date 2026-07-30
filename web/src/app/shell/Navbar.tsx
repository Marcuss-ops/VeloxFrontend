/**
 * Navbar — dock moderno con Lucide icons
 *
 * - Sfondo glass/blur premium con gradient border
 * - Scompare scroll giù, riappare scroll su
 * - Indicatore attivo animato
 * - Lucide icons invece di Material Symbols
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Sparkles,
    LayoutDashboard, 
    SquarePen, 
    Calendar,
    BarChart3,
    Folder
} from 'lucide-react';
import { APP_ROUTES } from '../routes';

const NAV_ITEMS = [
    { href: APP_ROUTES.dashboard, icon: LayoutDashboard, label: 'Canali' },
    { href: APP_ROUTES.content, icon: SquarePen, label: 'Contenuti' },
    { href: APP_ROUTES.calendar, icon: Calendar, label: 'Calendario' },
    { href: APP_ROUTES.analytics, icon: BarChart3, label: 'Analytics' },
    { href: APP_ROUTES.drive, icon: Folder, label: 'Media' },
];

function isActive(path: string, currentPath: string): boolean {
    return currentPath === path || currentPath.startsWith(`${path}/`);
}

export const Navbar: React.FC = () => {
    const location = useLocation();
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const el = document.getElementById('main-scroll-container');
        if (!el) return;

        const handleScroll = () => {
            const currentY = el.scrollTop;
            if (currentY > lastScrollY.current && currentY > 20) {
                setVisible(false);
            } else {
                setVisible(true);
            }
            lastScrollY.current = currentY;
        };

        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`
                fixed top-0 left-0 right-0 z-[100] h-14
                flex items-center justify-between px-6
                bg-slate-950/70 backdrop-blur-2xl
                border-b border-purple-500/10
                transition-transform duration-300 ease-out
                ${visible ? 'translate-y-0' : '-translate-y-full'}
            `}
        >
            {/* Gradient glow orl */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

            {/* Logo */}
            <Link
                to={APP_ROUTES.dashboard}
                title="InstaEdit"
                className="flex items-center gap-2 no-underline text-white group"
            >
                <div className="relative">
                    <Sparkles className="size-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <div className="absolute -inset-1 bg-purple-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-slate-100">
                    InstaEdit
                </span>
            </Link>

            {/* Nav items */}
            <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 border-l border-white/5 pl-2 ml-2">
                    {NAV_ITEMS.map(item => {
                        const active = isActive(item.href, location.pathname);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                title={item.label}
                                className={`
                                    relative size-9 rounded-lg
                                    flex items-center justify-center
                                    no-underline
                                    transition-all duration-200
                                    ${active 
                                        ? 'text-purple-300 bg-purple-500/15' 
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                                    }
                                `}
                            >
                                {active && (
                                    <span className="absolute inset-0 rounded-lg ring-1 ring-purple-500/30" />
                                )}
                                <Icon className="size-[18px]" />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
