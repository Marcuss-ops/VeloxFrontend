import { useState, useCallback } from 'react';
import { Job, Worker } from '../../Workers/types';
import { buildWorkersMap, filterJobsByStatus } from '../../Workers/jobUtils';
import { ApiSubmission, DashboardTab } from './types';
import { fetchJSON } from '../../../lib/api';
import { usePolling } from '../../../hooks/usePolling';

interface DashboardData {
    jobs: Job[];
    workers: Worker[];
    workersMap: Record<string, Worker>;
    apiSubmissions: ApiSubmission[];
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

export function useDashboardData(intervalMs = 10000, initialTab: DashboardTab = 'coda'): DashboardData {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workersMap, setWorkersMap] = useState<Record<string, Worker>>({});
    const [apiSubmissions, setApiSubmissions] = useState<ApiSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

    const fetchAll = useCallback(async (signal: AbortSignal) => {
        try {
            const [jobsRes, workersRes, submissionsRes] = await Promise.all([
                fetchJSON<{ jobs: Job[] }>('/api/v1/jobs'),
                fetchJSON<{ workers?: Worker[] }>('/api/v1/workers').catch(() => ({ workers: [] })),
                fetchJSON<{ items: ApiSubmission[] }>('/api/v1/submissions?limit=200').catch(() => ({ items: [] })),
            ]);

            if (signal.aborted) return;

            const jobsList = jobsRes?.jobs ?? [];
            const workersList = Array.isArray(workersRes?.workers) ? workersRes.workers : [];
            const submissions = submissionsRes?.items ?? [];

            setJobs(jobsList);
            setWorkers(workersList);
            setWorkersMap(buildWorkersMap(workersList));
            setApiSubmissions(submissions.reverse());
            setError(null);
        } catch (e: unknown) {
            if (signal.aborted) return;
            setError(e instanceof Error ? e.message : 'Fetch error');
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, []);

    // Unified polling authority: single-flight, visibility-gated, abortable
    // (replaces the raw setInterval that could overlap slow responses).
    const { refresh } = usePolling(fetchAll, intervalMs);

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
        loading,
        error,
        activeTab,
        setActiveTab,
        refresh,
        pending,
        running,
        completed,
        errors,
    };
}
