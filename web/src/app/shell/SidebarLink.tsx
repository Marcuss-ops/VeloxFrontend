import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarLinkProps {
    link: { href: string; icon: string; label: string; withTab?: string };
    active: boolean;
    style?: React.CSSProperties;
}

const renderSidebarIcon = (link: { icon: string }, active: boolean) => {
    return (
        <span
            className="material-symbols-rounded"
            style={{
                fontSize: 24,
                fontWeight: active ? 500 : 400,
            }}
        >
            {link.icon}
        </span>
    );
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ link, active, style }) => {
    const fullHref = link.withTab 
        ? `${link.href}?tab=${link.withTab}` 
        : link.href;

    return (
        <Link
            to={fullHref}
            title={link.label}
            style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                flexShrink: 0,
                color: active ? '#c4b5fd' : 'rgba(148,163,184,0.70)',
                transition: 'color 0.2s ease',
                ...style,
            }}
            className="sidebar-icon-link"
        >
            {renderSidebarIcon(link, active)}
        </Link>
    );
};

export default SidebarLink;
