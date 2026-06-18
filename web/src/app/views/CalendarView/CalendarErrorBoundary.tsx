/**
 * Calendar Error Boundary
 *
 * Catches errors in the CalendarView and its children,
 * displays a fallback UI instead of crashing the entire app.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface CalendarErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface CalendarErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export class CalendarErrorBoundary extends Component<CalendarErrorBoundaryProps, CalendarErrorBoundaryState> {
    constructor(props: CalendarErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): CalendarErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[CalendarView] Error caught by boundary:', error);
        console.error('[CalendarView] Component stack:', errorInfo.componentStack);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="h-full flex items-center justify-center bg-[#0a0a0f]">
                    <div className="text-center p-8 bg-white/5 border border-red-500/20 rounded-2xl max-w-md">
                        <span className="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
                        <h2 className="text-lg font-bold text-white mb-2">Calendar Error</h2>
                        <p className="text-sm text-white/60 mb-4">
                            Something went wrong loading the calendar.
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-red-300 bg-black/30 p-3 rounded-lg mb-4 overflow-auto max-h-32 text-left">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Reload Calendar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default CalendarErrorBoundary;
