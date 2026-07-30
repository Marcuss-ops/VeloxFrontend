/**
 * Auth API — session-based authentication.
 * GET /api/v1/auth/me — returns the current user from the session cookie.
 */

import { apiGet } from './client';

export interface AuthUser {
    id: number;
    name?: string;
    email?: string;
    workspaceId?: number;
    isAdmin: boolean;
}

export const authApi = {
    async getMe(): Promise<AuthUser | null> {
        try {
            return await apiGet<AuthUser>('/api/v1/auth/me');
        } catch {
            return null;
        }
    },
};
