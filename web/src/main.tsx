/**
 * Main Entry Point
 * 
 * Unified SPA entry point — single #react-app-root bootstrap.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './app/router';

/**
 * Error Boundary for catching React errors during bootstrap
 */
class BootstrapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: unknown }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: unknown) {
        return { hasError: true, error };
    }
    componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
        console.error('[FATAL ERROR] React Error Boundary caught:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, background: '#1a1a1a', color: '#ff4d4d', minHeight: '100vh', fontFamily: 'monospace' }}>
                    <h1>Something went wrong.</h1>
                    <pre>{String(this.state.error)}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

/**
 * Main App Component
 */
const App: React.FC = () => {
    return (
        <BootstrapErrorBoundary>
            <AppRouter />
        </BootstrapErrorBoundary>
    );
};

/**
 * Bootstrap the React application
 */
const appRoot = document.getElementById('react-script-tab-root');

if (appRoot) {
    createRoot(appRoot).render(<App />);
} else {
    console.error('[BOOT] #react-script-tab-root not found — fallback to #react-app-root');
    const fallbackRoot = document.getElementById('react-app-root');
    if (fallbackRoot) {
        createRoot(fallbackRoot).render(<App />);
    }
}