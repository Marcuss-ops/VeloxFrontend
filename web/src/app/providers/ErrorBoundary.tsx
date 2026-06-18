import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        message: '',
    };

    public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : 'Unexpected rendering error',
        };
    }

    public componentDidCatch(error: unknown): void {
        console.error('[MainApp] ErrorBoundary caught an error:', error);
    }

    public render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
                    <h2 className="text-lg font-semibold">UI error</h2>
                    <p className="mt-2 text-sm">{this.state.message}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

