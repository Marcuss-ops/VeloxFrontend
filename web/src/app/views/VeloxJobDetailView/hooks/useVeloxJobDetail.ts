/**
 * useVeloxJobDetail - Fetch and poll a Velox job with its social deliveries.
 *
 * Calls GET /api/v1/velox/jobs/{id} which returns the aggregated
 * { job, deliveries } shape. Polls every 5 seconds while the render
 * status is non-terminal.
 */

import { useCallback, useEffect, useState } from 'react';
import { veloxApi, type VeloxJobDetail, type VeloxJob, type VeloxDelivery } from '@/lib/api/veloxApi';

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD']);

interface UseVeloxJobDetailReturn {
  job: VeloxJob | null;
  deliveries: VeloxDelivery[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVeloxJobDetail(jobId: string | undefined): UseVeloxJobDetailReturn {
  const [detail, setDetail] = useState<VeloxJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    try {
      const data = await veloxApi.getJob(jobId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i dettagli del job Velox');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setError(null);
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    const isTerminal = detail?.job?.renderStatus && TERMINAL_STATUSES.has(detail.job.renderStatus);
    if (isTerminal || !jobId) return;

    const interval = window.setInterval(() => {
      fetchDetail();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [detail?.job?.renderStatus, fetchDetail, jobId]);

  return {
    job: detail?.job ?? null,
    deliveries: detail?.deliveries ?? [],
    loading,
    error,
    refresh: fetchDetail,
  };
}

export default useVeloxJobDetail;
