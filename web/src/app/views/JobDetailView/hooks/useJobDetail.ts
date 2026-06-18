/**
 * useJobDetail - Hook for job detail state, polling, and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi } from '../../../../lib/api/jobsApi';
import {
    JobDetailData,
    JobEvent,
    formatDuration,
    asString,
    computeDurationFromTimestamps,
    mapJobEventsToLogs,
    mapHistoryToLogs,
    mapShowlogToEvents,
    dedupeLogs,
} from '../../utils/jobDetail';

export const useJobDetail = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();

    const [job, setJob] = useState<JobDetailData | null>(null);
    const [logs, setLogs] = useState<JobEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
    const [now, setNow] = useState<Date>(new Date());

    const fetchJob = useCallback(async () => {
        if (!jobId) return;

        try {
            const data = await jobsApi.get(jobId);
            const slotData = data.slot_data || {};
            const progress = typeof data.progress === 'number' ? data.progress :
                typeof slotData.progress === 'number' ? slotData.progress :
                    data.status === 'COMPLETED' ? 100 : 0;

            const jobDetail: JobDetailData = {
                ...data,
                resolution: (slotData.resolution as string) || (slotData.width && slotData.height ? `${slotData.width} x ${slotData.height}` : '--'),
                codec: (slotData.codec as string) || '--',
                duration:
                    (typeof slotData.duration === 'number' ? formatDuration(slotData.duration) : null) ||
                    asString(slotData.duration) ||
                    computeDurationFromTimestamps(slotData.stock_clips_timestamps || (data as Record<string, unknown>).stock_clips_timestamps) ||
                    '--',
                progress,
            };

            setJob(jobDetail);

            let aggregatedLogs: JobEvent[] = [];
            try {
                const response = await fetch(`/job_events?job_id=${encodeURIComponent(jobId)}&limit=200`);
                if (response.ok) {
                    const payload = await response.json();
                    if (payload?.ok && Array.isArray(payload.events)) {
                        aggregatedLogs = mapJobEventsToLogs(payload.events);
                    }
                }
            } catch (err) {
                console.error('Error fetching job_events:', err);
            }

            if (aggregatedLogs.length === 0) {
                aggregatedLogs = mapHistoryToLogs((data as Record<string, unknown>).history);
            }

            const workerId = asString(data.assigned_to || data.worker_id);
            if (workerId && (aggregatedLogs.length === 0 || data.status === 'PROCESSING')) {
                try {
                    const workerResp = await fetch(`/api/v1/workers/${encodeURIComponent(workerId)}/logs?tail=200`);
                    if (workerResp.ok) {
                        const workerPayload = await workerResp.json();
                        const workerEvents = mapShowlogToEvents(workerPayload?.logs);
                        aggregatedLogs = [...aggregatedLogs, ...workerEvents];
                    }
                } catch (err) {
                    console.error('Error fetching worker logs:', err);
                }
            }

            const sorted = dedupeLogs(aggregatedLogs).sort((a, b) => {
                const ta = new Date(a.timestamp).getTime();
                const tb = new Date(b.timestamp).getTime();
                return ta - tb;
            });
            setLogs(sorted);
            setError(null);
        } catch (err) {
            console.error('Error fetching job:', err);
            setError('Impossibile caricare i dettagli del job');
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        setLoading(true);
        fetchJob();
    }, [fetchJob]);

    useEffect(() => {
        if (job?.status === 'PROCESSING') {
            const interval = window.setInterval(() => {
                fetchJob();
            }, 5000);
            setRefreshInterval(interval);
            return () => {
                if (interval) window.clearInterval(interval);
            };
        } else if (refreshInterval) {
            window.clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [job?.status, fetchJob, refreshInterval]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    const calculateElapsedTime = (): string => {
        if (!job?.created_at) return '--';
        const createdTs = typeof job.created_at === 'number' ? job.created_at * 1000 : new Date(job.created_at).getTime();
        if (Number.isNaN(createdTs)) return '--';

        let endTs: number;
        if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'ERROR' || job.status === 'CANCELED') {
            const end = job.completed_at || job.updated_at;
            endTs = typeof end === 'number' ? end * 1000 : new Date(end || 0).getTime();
            if (Number.isNaN(endTs) || endTs === 0) {
                endTs = now.getTime();
            }
        } else {
            endTs = now.getTime();
        }

        const elapsedSeconds = Math.floor((endTs - createdTs) / 1000);
        return formatDuration(Math.max(0, elapsedSeconds));
    };

    const handleRetry = async () => {
        if (!jobId) return;
        try {
            await jobsApi.retry(jobId);
            fetchJob();
        } catch (err) {
            console.error('Error retrying job:', err);
        }
    };

    const handleCancel = async () => {
        if (!jobId || !confirm('Sei sicuro di voler cancellare questo job?')) return;
        try {
            await jobsApi.delete(jobId);
            navigate(-1);
        } catch (err) {
            console.error('Error canceling job:', err);
        }
    };

    const handlePrioritize = () => {
        alert('Funzionalità non ancora implementata');
    };

    const handlePause = () => {
        alert('Funzionalità non ancora implementata');
    };

    return {
        job,
        jobId,
        logs,
        loading,
        error,
        now,
        calculateElapsedTime,
        handleRetry,
        handleCancel,
        handlePrioritize,
        handlePause,
    };
};
