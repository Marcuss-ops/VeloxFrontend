import { useState, useEffect, useCallback, useRef } from 'react';
import { Job, Worker } from './types';
import { buildWorkersMap } from './jobUtils';
import { jobsApi, workersApi } from '../../lib/api';

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
    const intervalRef = useRef<number | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [jobsRes, workersRes] = await Promise.all([
                jobsApi.list(),
                workersApi.list().catch(() => [] as Worker[]),
            ]);
            const jobsList = jobsRes?.jobs ?? [];
            const workersList = Array.isArray(workersRes) ? workersRes : [];
            setJobs(jobsList);
            setWorkers(workersList);
            setWorkersMap(buildWorkersMap(workersList));
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

    return { jobs, workers, workersMap, loading, error, refresh: fetchAll };
}