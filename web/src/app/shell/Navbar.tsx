/**
 * Navbar — minimal, solo logo InstaEdit
 */

import React from 'react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
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
            }}
        >
            <Link
                to="/"
                title="InstaEdit"
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
                    auto_awesome
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', color: '#f1f5f9' }}>
                    InstaEdit
                </span>
            </Link>
        </nav>
    );
};

export default Navbar;
