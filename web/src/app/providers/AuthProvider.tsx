import React, { createContext, useContext, useEffect, useCallback, useMemo, useState } from 'react';
import { authApi, type AuthUser as SessionUser } from '@/lib/api/authApi';
import { ApiError } from '@/lib/api/client';
import { maybeRefreshSession, SESSION_REFRESH_INTERVAL_MS } from '@/lib/session-refresh';

/**
 * User shape consumed by the UI. Mirrors the subset of fields the
 * header, sidebar, and route guards read. The `name` field is always
 * present (falls back to a default when the session returns none) so
 * existing consumers like MainHeader can render without null checks.
 */
interface AuthUser {
    id: number | string;
    name: string;
    email?: string;
    workspaceId?: number;
    isAdmin: boolean;
}

interface AuthContextValue {
    user: AuthUser;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    /** Re-fetch the session user (e.g. after login redirect). */
    refresh: () => Promise<void>;
}

const DEFAULT_USER: AuthUser = {
    id: 0,
    name: 'Guest',
    isAdmin: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const user = await authApi.getMe();
            setSessionUser(user);
        } catch (err) {
            // Network errors, 5xx — surface as error state but keep
            // the user unauthenticated. 401 is handled inside getMe
            // and returns null (not an error).
            const message =
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                        ? err.message
                        : 'Session lookup failed';
            setError(message);
            setSessionUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSession();
    }, [loadSession]);

    // Heartbeat: proactively refresh the session every 10 minutes
    // while the tab is visible, so the 15-minute JWT never expires.
    useEffect(() => {
        const tick = () => void maybeRefreshSession();
        // Run immediately on mount (covers the case where the tab
        // was backgrounded during a refresh window).
        tick();
        const interval = setInterval(tick, SESSION_REFRESH_INTERVAL_MS);
        // Also refresh when the tab becomes visible after being hidden.
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    const value = useMemo<AuthContextValue>(() => {
        const user: AuthUser = sessionUser
            ? {
                  id: sessionUser.id,
                  name: sessionUser.name || sessionUser.email || 'Operator',
                  email: sessionUser.email,
                  workspaceId: sessionUser.workspaceId,
                  isAdmin: sessionUser.isAdmin,
              }
            : DEFAULT_USER;
        return {
            user,
            isAuthenticated: sessionUser !== null,
            isLoading,
            error,
            refresh: loadSession,
        };
    }, [sessionUser, isLoading, error, loadSession]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
