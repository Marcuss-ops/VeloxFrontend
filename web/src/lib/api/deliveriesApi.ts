/**
 * Deliveries API — wrappers for delivery status queries.
 *
 * A delivery is the social publishing lifecycle of a rendered
 * artifact: Velox produces the video, hands it to InstaEdit via
 * the internal delivery contract, and InstaEdit publishes it to
 * the platform (YouTube, etc.). The frontend polls the delivery
 * status through the BFF to show a unified rendering + publishing
 * view.
 */

import { apiGet } from './client';

/** Terminal delivery statuses reported by the InstaEdit social publish worker. */
export type DeliveryStatus =
  | 'artifact_verified'
  | 'queued'
  | 'publishing'
  | 'waiting_provider'
  | 'published'
  | 'failed'
  | 'blocked_auth'
  | 'dead_letter';

/** A social delivery with its current status. */
export interface Delivery {
  id: string;
  status: DeliveryStatus;
  externalDestinationId: string;
  socialDeliveryId?: string;
  platformMediaId?: string;
  platformUrl?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** List deliveries for a specific job (via the BFF). */
export function listDeliveriesForJob(jobId: string): Promise<{ deliveries: Delivery[] }> {
  return apiGet(`/api/v1/velox/jobs/${encodeURIComponent(jobId)}/deliveries`);
}

/** Convenience lookup: fetch deliveries for a job and return the one matching
 * the requested external destination. Returns `undefined` when the destination
 * is not present (for example, the job has not yet reached the delivery phase). */
export async function getDeliveryForDestination(
  jobId: string,
  externalDestinationId: string
): Promise<Delivery | undefined> {
  const { deliveries } = await listDeliveriesForJob(jobId);
  return deliveries.find((d) => d.externalDestinationId === externalDestinationId);
}

/** True when a delivery has reached a successful terminal state. */
export function isDeliveryPublished(status: DeliveryStatus): boolean {
  return status === 'published';
}

/** True when a delivery has reached a failure terminal state. */
export function isDeliveryFailed(status: DeliveryStatus): boolean {
  return status === 'failed' || status === 'blocked_auth' || status === 'dead_letter';
}

export const deliveriesApi = {
  listDeliveriesForJob,
  getDeliveryForDestination,
  isDeliveryPublished,
  isDeliveryFailed,
};
