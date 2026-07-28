// lib/api/bff/projects.ts — Velox projects + jobs BFF client surface
// for the dark editor. Extracted from lib/api/bff.ts (commit 4 of 7 in
// the api-bff refactor series). The dark editor only passes the opaque
// external_destination_id; no platform credentials ever leave InstaEdit.
//
// Public surface (preserved byte-identical so existing
// `@/lib/api/bff` callers continue to work via the parent bff.ts
// re-export block at the bottom):
//   - type VeloxProject
//   - type VeloxJob
//   - type CreateVeloxJobRequest
//   - function createVeloxProject(body): Promise<VeloxProject>
//   - function createVeloxJob(body): Promise<VeloxJob>

import { bffPost } from './types';

export interface VeloxProject {
  id: string;
  name: string;
  workspaceId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createVeloxProject(body: { name: string; templateId?: string }): Promise<VeloxProject> {
  return bffPost('/api/v1/projects', body);
}

export interface VeloxJob {
  id: string;
  projectId?: string;
  renderStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVeloxJobRequest {
  projectId: string;
  renderSpec: Record<string, unknown>;
  deliveryPlan: {
    destinations: Array<{
      externalDestinationId: string;
      metadata?: Record<string, unknown>;
    }>;
  };
}

export function createVeloxJob(body: CreateVeloxJobRequest): Promise<VeloxJob> {
  return bffPost('/api/v1/velox/jobs', {
    project_id: body.projectId,
    render_spec: body.renderSpec,
    delivery_plan: {
      destinations: body.deliveryPlan.destinations.map(d => ({
        external_destination_id: d.externalDestinationId,
        metadata: d.metadata,
      })),
    },
  });
}
