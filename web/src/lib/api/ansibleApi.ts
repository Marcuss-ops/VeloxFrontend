import { fetchJSON, fetchVoid } from './core';
import { CapabilitiesResponse } from '../../components/Ansible/types';

const ADMIN = '/api/v1/admin/ansible';
const PUBLIC = '/api/v1/ansible';

export const ansibleApi = {
  computers: () => fetchJSON(`${ADMIN}/computers/list`),

  // Capability-driven UI: fetch available actions from backend
  capabilities: () => fetchJSON<CapabilitiesResponse>(`${PUBLIC}/capabilities`),

  saveComputer: (computer: Record<string, unknown>) =>
    fetchJSON(`${ADMIN}/computers`, {
      method: 'POST',
      body: JSON.stringify(computer),
    }),

  deleteComputer: (id: string) =>
    fetchVoid(`${ADMIN}/computers/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  testSSH: (computerId: string) =>
    fetchJSON(`${PUBLIC}/computers/test_ssh`, {
      method: 'POST',
      body: JSON.stringify({ computer_id: computerId }),
    }),

  runAction: (computerIds: string[], action: string) =>
    fetchJSON<{ run_id: string }>(`${PUBLIC}/computers/run_action`, {
      method: 'POST',
      body: JSON.stringify({ computer_ids: computerIds, action }),
    }),

  runShell: (computerIds: string[], command: string) =>
    fetchJSON<{ run_id: string }>(`${PUBLIC}/computers/run_shell`, {
      method: 'POST',
      body: JSON.stringify({ computer_ids: computerIds, command }),
    }),

  computerLogs: (id: string, limit = 200) =>
    fetchJSON(`${ADMIN}/computers/logs/${encodeURIComponent(id)}?limit=${limit}`),
};
