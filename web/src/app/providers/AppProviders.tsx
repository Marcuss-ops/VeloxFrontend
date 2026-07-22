import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { I18nProvider } from './I18nProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { ScriptProvider } from './ScriptProvider';
import { VeloxAPIProvider } from './VeloxAPIProvider';

// QueryClient centralizzato con configurazione ottimizzata
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minuti
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <I18nProvider>
                        <VeloxAPIProvider>
                            <ScriptProvider>
                                {children}
                            </ScriptProvider>
                        </VeloxAPIProvider>
                    </I18nProvider>
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

