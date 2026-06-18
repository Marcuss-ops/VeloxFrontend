import React, { createContext, useContext, useMemo } from 'react';

interface AuthUser {
    id: string;
    role: 'admin';
    name: string;
}

interface AuthContextValue {
    user: AuthUser;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useMemo<AuthContextValue>(() => ({
        user: {
            id: 'local-admin',
            role: 'admin',
            name: 'Operator',
        },
        isAuthenticated: true,
    }), []);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

