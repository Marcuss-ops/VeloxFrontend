// BFF auth client \u2014 the InstaEditor's thin wrapper around InstaEdit's
// /api/v1/auth/me endpoint.
//
// Domain module. Imports the shared CSRF-aware fetcher from the
// sibling lib/api/bff/types.ts module. Originally co-located with
// the rest of the BFF in lib/api/bff.ts; extracted here so that
// `import { getMe, BffUser } from '@/lib/api/bff/auth'` becomes the
// canonical import path for future auth-only callers.

import { bffFetch } from './types';

// ------------------------------------------------------------------
// Wire types
// ------------------------------------------------------------------

export interface BffUser {
  id: number;
  name: string;
  email?: string;
  workspace_id: number;
  is_admin?: boolean;
}

// ------------------------------------------------------------------
// /api/v1/auth/me
// ------------------------------------------------------------------

/**
 * Round-trip the current InstaEdit session cookie + return the user
 * row (id + name + email + workspace_id + is_admin). Used by the
 * InstaEditor on mount to gate workspace-scoped UI behind auth.
 */
export function getMe(): Promise<{ user: BffUser }> {
  return bffFetch('/api/v1/auth/me');
}
