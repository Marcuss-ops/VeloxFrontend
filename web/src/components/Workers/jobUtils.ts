import { ErrorInfo, Job, Worker } from './types';

export function toISODateTime(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    const t = typeof value;
    if (t === 'string') return value as string;
    if (t === 'number') {
        const ms = (value as number) < 1e12 ? (value as number) * 1000 : (value as number);
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (t === 'object') {
        const v = value as Record<string, unknown>;
        const candidate = v.iso ?? v.date ?? v.datetime ?? v.$date ?? v.value;
        if (candidate !== undefined) return toISODateTime(candidate);
        try {
            const d = new Date(value as never);
            return isNaN(d.getTime()) ? String(value) : d.toISOString();
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function getWorkerDisplay(job: Job, workersMap: Record<string, Worker>): string {
    const workerIp = (job.assigned_worker_ip ?? '').trim();
    if (workerIp) return workerIp;
    const wid = job.assigned_to ?? job.worker_id;
    if (!wid) return 'Unassigned';
    const w = workersMap[wid];
    if (w) return w.ip ?? w.ip_address ?? w.host ?? w.name ?? `${wid.slice(0, 12)}...`;
    return `${wid.slice(0, 12)}...`;
}

export function formatDuration(startedAt: string | number | undefined): string {
    if (!startedAt) return '--:--';
    const iso = toISODateTime(startedAt);
    if (!iso) return '--:--';
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return '0s';
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function formatDateTime(value: string | number | null | undefined): string {
    const iso = toISODateTime(value);
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString();
}

export function getVideoName(job: Job): string {
    return job.video_name ?? job.slot_data?.video_name ?? 'N/A';
}

export function categorizeYouTubeError(errorMsg: string | undefined): ErrorInfo {
    if (!errorMsg) return { category: 'UNKNOWN', icon: 'help', color: 'slate', hint: 'Errore sconosciuto' };
    const err = errorMsg.toLowerCase();
    if (err.includes('idempoten') || err.includes('already exists') || err.includes('duplicate') || err.includes('video already'))
        return { category: 'IDEMPOTENT', icon: 'content_copy', color: 'blue', hint: 'Video già caricato (idempotenza)' };
    if (err.includes('oauth') || err.includes('token') || err.includes('unauthorized') || err.includes('auth') || err.includes('credential'))
        return { category: 'OAUTH', icon: 'key_off', color: 'amber', hint: 'OAuth/token mancante o scaduto' };
    if (err.includes('quota') || err.includes('limit') || err.includes('rate'))
        return { category: 'QUOTA', icon: 'hourglass_empty', color: 'orange', hint: 'Quota superata' };
    if (err.includes('too long') || err.includes('too large') || err.includes('size') || err.includes('duration'))
        return { category: 'SIZE', icon: 'scale', color: 'purple', hint: 'Video troppo lungo o grande' };
    if (err.includes('copyright') || err.includes('blocked') || err.includes('claim'))
        return { category: 'COPYRIGHT', icon: 'copyright', color: 'red', hint: 'Problema copyright' };
    if (err.includes('network') || err.includes('connection') || err.includes('timeout') || err.includes('fetch'))
        return { category: 'NETWORK', icon: 'wifi_off', color: 'cyan', hint: 'Errore di rete' };
    if (err.includes('channel not found') || err.includes('no channel'))
        return { category: 'CHANNEL', icon: 'tv_off', color: 'pink', hint: 'Canale non trovato' };
    return { category: 'ERROR', icon: 'error', color: 'red', hint: 'Errore upload video' };
}

export function getYouTubeFailureLabel(errorMsg: string | undefined): string {
    if (!errorMsg) return 'Not Attempted';
    const err = errorMsg.toLowerCase();
    if (err.includes('oauth') && err.includes('missing')) return 'OAuth Missing';
    if (err.includes('invalid') && err.includes('token')) return 'Invalid Token';
    if (err.includes('token') || err.includes('oauth') || err.includes('credential') || err.includes('unauthorized')) return 'Auth Error';
    if (err.includes('quota') || err.includes('rate') || err.includes('limit')) return 'Quota Exceeded';
    if (err.includes('pending') && err.includes('missing')) return 'Pending Missing';
    if (err.includes('module') && err.includes('unavailable')) return 'Module Missing';
    if (err.includes('group missing')) return 'Group Missing';
    if (err.includes('input') && err.includes('incomplete')) return 'Input Incomplete';
    return 'Upload Failed';
}

export function buildWorkersMap(workers: Worker[]): Record<string, Worker> {
    const map: Record<string, Worker> = {};
    workers.forEach(w => { if (w.worker_id) map[w.worker_id] = w; });
    return map;
}

export function filterJobsByStatus(jobs: Job[], ...statuses: string[]): Job[] {
    return jobs.filter(j => statuses.includes(j.status));
}
