/**
 * Minimal BFF client for the dark editor to call the InstaEdit BFF.
 *
 * The web/src/lib/api/client.ts is Vite-specific (import.meta.env),
 * so the dark editor keeps its own thin wrapper. Calls rely on the
 * same session cookie + CSRF double-submit used by the main Vite app.
 */

const BFF_BASE = ''; // same-origin; production deployments should host the editor under the BFF domain

/** Read a cookie by name. */
function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = name + '=';
  const entries = document.cookie.split(';');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return '';
}

/** CSRF-aware JSON fetch. */
async function bffFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
    if (!headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const url = `${BFF_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string; reason?: string };
      if (body?.error && typeof body.error === 'string') message = body.error;
      else if (body?.reason && typeof body.reason === 'string') message = body.reason;
    } catch {
      // ignore
    }
    throw new Error(message ?? response.statusText ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export interface BffUser {
  id: number;
  name: string;
  email?: string;
  workspace_id: number;
  is_admin?: boolean;
}

export function getMe(): Promise<{ user: BffUser }> {
  return bffFetch('/api/v1/auth/me');
}

// ------------------------------------------------------------------
// Social destinations (generic, platform-agnostic)
// ------------------------------------------------------------------

export interface SocialDestination {
  external_destination_id: string;
  label?: string;
  provider?: string;
  status: 'active' | 'disabled' | 'reauth_required';
  platform_account_id: number;
  workspace_id: number;
  source_system?: string;
  defaults?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export function listSocialDestinations(
  workspaceId: number
): Promise<{ destinations: SocialDestination[] }> {
  return bffFetch(
    `/api/v1/integrations/velox/destinations?workspace_id=${encodeURIComponent(workspaceId)}`
  );
}

// ------------------------------------------------------------------
// Velox projects/jobs — the dark editor only passes the opaque
// external_destination_id; no platform credentials ever leave InstaEdit.
// ------------------------------------------------------------------

export interface VeloxProject {
  id: string;
  name: string;
  workspaceId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createVeloxProject(body: { name: string; templateId?: string }): Promise<VeloxProject> {
  return bffPost('/api/v1/projects', body);
}

export interface VeloxJob {
  id: string;
  projectId?: string;
  renderStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVeloxJobRequest {
  projectId: string;
  renderSpec: Record<string, unknown>;
  deliveryPlan: {
    destinations: Array<{
      externalDestinationId: string;
      metadata?: Record<string, unknown>;
    }>;
  };
}

export function createVeloxJob(body: CreateVeloxJobRequest): Promise<VeloxJob> {
  return bffPost('/api/v1/velox/jobs', {
    project_id: body.projectId,
    render_spec: body.renderSpec,
    delivery_plan: {
      destinations: body.deliveryPlan.destinations.map(d => ({
        external_destination_id: d.externalDestinationId,
        metadata: d.metadata,
      })),
    },
  });
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function bffPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return bffFetch<T>(endpoint, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
