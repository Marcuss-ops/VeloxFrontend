/**
 * Navbar — dock trasparente stile Google Flow
 *
 * - Solo icone, niente label (tranne logo)
 * - Sfondo glass/blur
 * - Scompare scroll giù, riappare scroll su
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_ROUTES } from '../routes';

const NAV_ITEMS = [
    { href: APP_ROUTES.dashboard, icon: 'grid_view', label: 'Panoramica' },
    { href: APP_ROUTES.calendar, icon: 'calendar_month', label: 'Calendario' },
    { href: APP_ROUTES.youtubeSuite, icon: 'smart_display', label: 'YouTube' },
    { href: APP_ROUTES.workersAnsible, icon: 'engineering', label: 'Workers' },
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
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 56,
                padding: '0 24px',
                background: 'rgba(6, 4, 14, 0.75)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: visible ? 'translateY(0)' : 'translateY(-100%)',
            }}
        >
            {/* Logo */}
            <Link
                to={APP_ROUTES.dashboard}
                title="Velox"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    color: '#ffffff',
                }}
            >
                <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 22, fontWeight: 500, color: '#c084fc' }}
                >
                    hub
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', color: '#f1f5f9' }}>
                    Velox
                </span>
                </Link>

            {/* Icone nav + pill button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link
                    to={`${APP_ROUTES.creatorStudio}?tab=script`}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 500,
                        border: '1px solid #333',
                        padding: '6px 14px',
                        borderRadius: 50,
                        transition: 'background 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                        (e.currentTarget as HTMLElement).style.borderColor = '#555';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.borderColor = '#333';
                    }}
                >
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>movie_edit</span>
                    Studio
                </Link>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderLeft: '1px solid #1a1a1a',
                    paddingLeft: 6,
                    marginLeft: 2,
                }}>
                    {NAV_ITEMS.map(item => {
                        const active = isActive(item.href, location.pathname);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                title={item.label}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textDecoration: 'none',
                                    color: active ? '#c084fc' : 'rgba(148,163,184,0.60)',
                                    background: active ? 'rgba(192,132,252,0.12)' : 'transparent',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!active) {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                                        (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!active) {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.60)';
                                    }
                                }}
                            >
                                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                                    {item.icon}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
