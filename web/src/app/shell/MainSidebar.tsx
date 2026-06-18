/**
 * Main Sidebar Component
 * 
 * AGENT 13D - Routing e State Unificati
 * 
 * Utilizza React Router Link per navigazione client-side
 * senza full page reload.
 * 
 * Include mini calendario integrato con design Linear.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import MiniCalendar from './MiniCalendar';
import SidebarLink from './SidebarLink';
import { APP_ROUTES } from '../routes';

interface MainSidebarProps {
    currentView?: string; // Deprecated - now uses useLocation()
    onNavigate?: (view: string) => void; // Deprecated - now uses Link
}

// Unified Sidebar Links - ALWAYS VISIBLE
const SIDEBAR_LINKS = [
    { href: APP_ROUTES.dashboard, icon: 'grid_view', label: 'Panoramica' },
    { href: APP_ROUTES.calendar, icon: 'calendar_month', label: 'Calendario' },
    { href: APP_ROUTES.youtubeSuite, icon: 'smart_display', label: 'YouTube' },
    { href: APP_ROUTES.workersAnsible, icon: 'engineering', label: 'Workers' },
    { href: APP_ROUTES.creatorStudio, icon: 'movie_edit', label: 'Studio', withTab: 'script' },
];

const sidebarStyle: React.CSSProperties = {
    width: 64,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    gap: 4,
    background: 'rgba(8,6,16,0.95)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRight: '1px solid rgba(139,92,246,0.20)',
    zIndex: 50,
    overflowY: 'auto',
    overflowX: 'visible',
};

const logoStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
    marginBottom: 6,
    textDecoration: 'none',
};

const dividerStyle: React.CSSProperties = {
    width: 28,
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '4px 0',
    flexShrink: 0,
};

export const MainSidebar: React.FC<MainSidebarProps> = ({ currentView: _deprecatedCurrentView }) => {
    const location = useLocation();
    
    const isActive = (linkHref: string): boolean => {
        const currentPath = location.pathname;
        const currentTab = new URLSearchParams(location.search).get('tab');

        const [linkBase, linkQuery] = linkHref.split('?');
        const linkTab = new URLSearchParams(linkQuery || '').get('tab');

        if (currentPath !== linkBase) {
            return false;
        }

        if (linkBase === '/creator_studio_app' && linkTab) {
            return currentTab === linkTab;
        }

        if (linkBase === APP_ROUTES.dashboard) {
            if (!linkTab) {
                return !currentTab || currentTab === 'panoramica' || currentTab === 'dati';
            }
            return linkTab === currentTab;
        }

        return true;
    };

    return (
        <aside
            id="react-dock-sidebar"
            style={sidebarStyle}
        >
            {/* Logo - solo icona */}
            <Link to={APP_ROUTES.dashboard} title="Home" style={logoStyle}>
                <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'white' }}>hub</span>
            </Link>

            <div style={dividerStyle} />

            {/* Mini Calendar */}
            <MiniCalendar />

            {/* Links */}
            {SIDEBAR_LINKS.map(link => (
                <SidebarLink 
                    key={link.href} 
                    link={link} 
                    active={isActive(link.href)} 
                />
            ))}

            {/* Status */}
            <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #10b981 0%, #059669 100%)',
                    boxShadow: '0 0 8px 1px rgba(16,185,129,0.6)',
                }} />
                <span style={{
                    fontSize: 8,
                    fontFamily: 'monospace',
                    color: '#475569',
                    letterSpacing: '0.5px',
                }}>ONLINE</span>
            </div>
        </aside>
    );
};
