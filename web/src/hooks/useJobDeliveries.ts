import { useQuery } from '@tanstack/react-query';
import { deliveriesApi, Delivery } from '@/lib/api/deliveriesApi';

export const JOB_DELIVERIES_QUERY_KEY = 'job-deliveries';

export interface UseJobDeliveriesResult {
    deliveries: Delivery[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
}

/** Fetch the social publishing deliveries for a Velox job.
 *
 * The BFF returns the list of deliveries associated with a job.
 * Each delivery carries the current status and, when published,
 * the platform URL (e.g. YouTube watch URL). This replaces the
 * legacy `Job.last_upload_result` fields.
 */
export function useJobDeliveries(jobId: string | undefined): UseJobDeliveriesResult {
    const { data, isLoading, isError, error } = useQuery<{ deliveries: Delivery[] }, Error>({
        queryKey: [JOB_DELIVERIES_QUERY_KEY, jobId],
        queryFn: async () => {
            if (!jobId) return { deliveries: [] };
            return deliveriesApi.listDeliveriesForJob(jobId);
        },
        enabled: !!jobId,
        staleTime: 30_000,
        refetchInterval: (query) => {
            const deliveries = (query.state.data as { deliveries: Delivery[] } | undefined)?.deliveries ?? [];
            const terminal: string[] = ['published', 'failed', 'blocked_auth', 'dead_letter'];
            const hasDeliveries = deliveries.length > 0;
            const allTerminal = hasDeliveries && deliveries.every((d) => terminal.includes(d.status));
            return allTerminal ? false : 5_000;
        },
    });

    return {
        deliveries: data?.deliveries ?? [],
        isLoading,
        isError,
        error,
    };
}
