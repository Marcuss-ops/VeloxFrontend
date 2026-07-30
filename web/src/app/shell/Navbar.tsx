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
                fixed top-0 left-0 right-0 z-[100] h-12
                flex items-center justify-between px-5
                bg-background/90 backdrop-blur-2xl
                border-b border-border
                transition-transform duration-300 ease-out
                ${visible ? 'translate-y-0' : '-translate-y-full'}
            `}
        >
            {/* Logo */}
            <Link
                to={APP_ROUTES.dashboard}
                title="InstaEdit"
                className="flex items-center gap-2.5 no-underline group"
            >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
                    <Sparkles className="size-4 text-primary" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-white/90">
                    InstaEdit
                </span>
            </Link>

            {/* Nav items - pill style */}
            <div className="flex items-center gap-1 p-0.5 bg-white/[0.04] rounded-xl border border">
                {NAV_ITEMS.map(item => {
                    const active = isActive(item.href, location.pathname);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            title={item.label}
                            className={`
                                relative flex items-center gap-2 px-3 py-1.5 rounded-lg
                                no-underline transition-all duration-200
                                ${active 
                                    ? 'text-white bg-primary/20' 
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                                }
                            `}
                        >
                            <Icon className="size-4" />
                            <span className="text-xs font-medium hidden sm:inline">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default Navbar;
