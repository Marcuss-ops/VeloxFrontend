/**
 * Minimal API client — session-aware fetch helpers.
 * Replaced the old ~500-line BFF client with a lean 30-line version
 * after stripping all legacy features.
 */

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public body?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error || res.statusText, res.status, body);
    }
    return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, options: { signal?: AbortSignal } = {}): Promise<T> {
    return apiFetch<T>(path, { method: 'GET', signal: options.signal });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
    return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
