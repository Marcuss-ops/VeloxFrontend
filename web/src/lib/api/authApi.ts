/**
 * Auth API — session-based authentication against the InstaEdit BFF.
 *
 * The frontend never stores tokens. Authentication relies entirely on
 * the HttpOnly session cookie set by the BFF at login. The only
 * auth-related call the frontend makes is GET /api/v1/auth/me, which
 * returns the current user's identity scoped to the active workspace.
 */

import { apiGet, ApiError } from './client';

/** User identity as returned by GET /api/v1/auth/me. */
export interface AuthUser {
  /** Numeric user id from the InstaEdit users table. */
  id: number;
  /** Display name for the UI header. */
  name: string;
  /** Email address (optional — may be absent for some providers). */
  email?: string;
  /** Active workspace id — the tenant scope for all BFF calls. */
  workspaceId: number;
  /** Whether the user has admin privileges (gates /admin/* routes). */
  isAdmin: boolean;
}

/** Response shape from GET /api/v1/auth/me. */
export interface MeResponse {
  user: AuthUser;
}

/**
 * Fetch the current authenticated user from the BFF session.
 *
 * Uses credentials: 'include' (via apiGet → apiFetch) so the
 * HttpOnly session cookie is sent. Returns null on 401 (not
 * authenticated) so the caller can redirect to login without
 * throwing.
 */
export async function getMe(): Promise<AuthUser | null> {
  try {
    const response = await apiGet<MeResponse | AuthUser>('/api/v1/auth/me');
    // The BFF may return either { user: AuthUser } or AuthUser directly;
    // normalise to AuthUser.
    if ('user' in response && response.user) {
      return response.user;
    }
    return response as AuthUser;
  } catch (err) {
    // 401 = not authenticated; return null so the AuthProvider can
    // show a login redirect rather than an error state.
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export const authApi = {
  getMe,
};
