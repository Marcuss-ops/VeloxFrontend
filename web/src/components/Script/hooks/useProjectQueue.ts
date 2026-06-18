/**
 * useProjectQueue Hook
 * 
 * Queue management logic for project generation:
 * - Backend response type definitions
 * - Queue confirmation checking
 * - Backend error message extraction
 */

// Backend response interface
export interface BackendResponse {
    ok?: boolean;
    job_id?: string;
    jobId?: string;
    queue_id?: string;
    queueId?: string;
    status?: string;
    error?: string;
    detail?: string;
    message?: string;
    reason?: string;
    msg?: string;
    missing_dependencies?: string[];
    missing_fields?: string[];
    errors?: unknown[];
    [key: string]: unknown;
}

// API response interface
export interface ApiResponse {
    status: number;
    body: BackendResponse | null;
    text: string;
}

// Title result interface
export interface TitleResult {
    titleIndex: number;
    title: string;
    result: BackendResponse | null;
    status: number;
}

/**
 * Checks whether a backend response confirms successful queue registration.
 */
export const hasQueueConfirmation = (result: BackendResponse | null): boolean => {
    if (!result || typeof result !== 'object') return false;
    
    const jobId = String(result.job_id || result.jobId || '').trim();
    if (jobId) return true;
    
    const queueId = String(result.queue_id || result.queueId || '').trim();
    if (queueId) return true;
    
    const status = String(result.status || '').toUpperCase();
    return ['PENDING', 'QUEUED', 'PROCESSING', 'RUNNING'].includes(status);
};

/**
 * Extracts a human-readable error message from a backend response payload.
 * Handles strings, arrays, and objects with common error fields.
 */
export const getBackendErrorMessage = (payload: unknown, fallback = 'Errore backend'): string => {
    if (!payload) return fallback;
    
    if (typeof payload === 'string') {
        return payload.trim() || fallback;
    }
    
    if (Array.isArray(payload)) {
        const lines = payload.map(item => getBackendErrorMessage(item, '')).filter(Boolean);
        return lines.length ? lines.join(' | ') : fallback;
    }
    
    if (typeof payload === 'object') {
        const obj = payload as BackendResponse;
        const primary = obj.error || obj.detail || obj.message || obj.reason || obj.msg || '';
        if (typeof primary === 'string' && primary.trim()) return primary.trim();
        
        if (Array.isArray(obj.missing_dependencies) && obj.missing_dependencies.length) {
            return `Librerie mancanti: ${obj.missing_dependencies.join(', ')}`;
        }
        
        if (Array.isArray(obj.missing_fields) && obj.missing_fields.length) {
            return `Campi mancanti: ${obj.missing_fields.join(', ')}`;
        }
        
        if (Array.isArray(obj.errors) && obj.errors.length) {
            return getBackendErrorMessage(obj.errors, fallback);
        }
        
        try {
            const compact = JSON.stringify(payload);
            return compact && compact !== '{}' ? compact : fallback;
        } catch { /* fetch failed */ }
        return fallback;
    }
    
    return fallback;
};

export default hasQueueConfirmation;