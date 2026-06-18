import { useState, useEffect, useCallback, useRef } from 'react';
import { Job, Worker } from '../../Workers/types';
import { buildWorkersMap, filterJobsByStatus } from '../../Workers/jobUtils';
import { ApiSubmission, YouTubeChannelSummary, DashboardTab } from './types';

interface DashboardData {
    jobs: Job[];
    workers: Worker[];
    workersMap: Record<string, Worker>;
    apiSubmissions: ApiSubmission[];
    ytSummary: YouTubeChannelSummary;
    loading: boolean;
    error: string | null;
    activeTab: DashboardTab;
    setActiveTab: (tab: DashboardTab) => void;
    refresh: () => void;
    // Derived data
    pending: Job[];
    running: Job[];
    completed: Job[];
    errors: Job[];
}

interface ChannelsApiResponse {
    ok: boolean;
    channels: Array<{
        id: string;
        name?: string;
        title?: string;
        thumbnail?: string;
        email?: string;
        token_valid?: boolean;
    }>;
    count: number;
}

async function fetchJSON<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Convert channels API response to summary format
function computeChannelSummary(response: ChannelsApiResponse | null): YouTubeChannelSummary {
    if (!response || !response.channels) {
        return {};
    }
    
    const channels = response.channels;
    const total = channels.length;
    
    // Count channels by token status
    let tokenPresent = 0;
    let noToken = 0;
    let ok = 0;
    let error = 0;
    
    for (const ch of channels) {
    // For now, we count all channels as having token present
    // since validate_tokens=false returns token_valid=true for all
        if (ch.token_valid === true) {
            tokenPresent++;
            ok++;
        } else if (ch.token_valid === false) {
            noToken++;
            error++;
        } else {
            // token_valid not set, assume valid
            tokenPresent++;
            ok++;
        }
    }
    
    return {
        total_channels: total,
        channels_token_present: tokenPresent,
        channels_no_token: noToken,
        channels_reauth: 0,
        channels_error: error,
        channels_ok: ok,
    };
}

export function useDashboardData(intervalMs = 10000, initialTab: DashboardTab = 'coda'): DashboardData {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workersMap, setWorkersMap] = useState<Record<string, Worker>>({});
    const [apiSubmissions, setApiSubmissions] = useState<ApiSubmission[]>([]);
    const [ytSummary, setYtSummary] = useState<YouTubeChannelSummary>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
    const intervalRef = useRef<number | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [jobsRes, workersRes, submissionsRes, channelsRes] = await Promise.all([
                fetchJSON<{ jobs: Job[] }>('/api/v1/jobs'),
                fetchJSON<{ workers?: Worker[] }>('/api/v1/workers').catch(() => ({ workers: [] })),
                fetchJSON<{ items: ApiSubmission[] }>('/api/v1/submissions?limit=200').catch(() => ({ items: [] })),
                fetchJSON<ChannelsApiResponse>('/api/v1/youtube/channels?validate_tokens=false').catch(() => null),
            ]);

            const jobsList = jobsRes?.jobs ?? [];
            const workersList = Array.isArray(workersRes?.workers) ? workersRes.workers : [];
            const submissions = submissionsRes?.items ?? [];

            setJobs(jobsList);
            setWorkers(workersList);
            setWorkersMap(buildWorkersMap(workersList));
            setApiSubmissions(submissions.reverse());
            setYtSummary(computeChannelSummary(channelsRes));
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Fetch error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        intervalRef.current = window.setInterval(fetchAll, intervalMs);
        return () => {
            if (intervalRef.current !== null) clearInterval(intervalRef.current);
        };
    }, [fetchAll, intervalMs]);

    const pending = filterJobsByStatus(jobs, 'PENDING');
    const running = filterJobsByStatus(jobs, 'PROCESSING');
    const completed = filterJobsByStatus(jobs, 'COMPLETED').sort((a, b) =>
        String(b.completed_at ?? b.updated_at ?? '').localeCompare(String(a.completed_at ?? a.updated_at ?? ''))
    );
    const errors = filterJobsByStatus(jobs, 'ERROR', 'FAILED').sort((a, b) =>
        String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
    );

    return {
        jobs,
        workers,
        workersMap,
        apiSubmissions,
        ytSummary,
        loading,
        error,
        activeTab,
        setActiveTab,
        refresh: fetchAll,
        pending,
        running,
        completed,
        errors,
    };
}
