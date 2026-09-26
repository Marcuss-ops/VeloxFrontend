import { useState, useCallback } from 'react';
import { Job, Worker } from './types';
import { buildWorkersMap } from './jobUtils';
import { jobsApi, workersApi } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';

interface JobsData {
    jobs: Job[];
    workers: Worker[];
    workersMap: Record<string, Worker>;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useJobsData(intervalMs = 10000): JobsData {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workersMap, setWorkersMap] = useState<Record<string, Worker>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async (signal: AbortSignal) => {
        try {
            const [jobsRes, workersRes] = await Promise.all([
                jobsApi.list(),
                workersApi.list().catch(() => [] as Worker[]),
            ]);
            if (signal.aborted) return;
            const jobsList = jobsRes?.jobs ?? [];
            const workersList = Array.isArray(workersRes) ? workersRes : [];
            setJobs(jobsList);
            setWorkers(workersList);
            setWorkersMap(buildWorkersMap(workersList));
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

    return { jobs, workers, workersMap, loading, error, refresh };
}