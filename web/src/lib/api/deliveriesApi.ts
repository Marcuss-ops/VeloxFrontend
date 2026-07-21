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

/** A social delivery with its current status. */
export interface Delivery {
  id: string;
  status: string;
  externalDestinationId: string;
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

export const deliveriesApi = {
  listDeliveriesForJob,
};
