import { useState, useEffect, useCallback, useRef } from 'react';
import { AnsibleComputer, AnsibleRun, AnsibleComputerLog, WorkerStatus, ActionCapability, CapabilitiesResponse } from '../../types';
import { fetchJSON, ansibleApi } from '../../../../lib/api';

interface AnsibleComputersData {
    computers: AnsibleComputer[];
    computersMap: Record<string, AnsibleComputer>;
    runs: AnsibleRun[];
    logs: Record<string, AnsibleComputerLog[]>;
    workersStatus: WorkerStatus[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    fetchComputerLogs: (computerId: string) => Promise<AnsibleComputerLog[]>;
}

// Transform API response to AnsibleComputer
function transformComputer(id: string, data: Record<string, unknown>): AnsibleComputer {
    return {
        id: id,
        host: String(data.host ?? id),
        ansible_user: String(data.ansible_user ?? 'pierone'),
        ssh_password: data.ssh_password as string | undefined,
        ssh_key_path: data.ssh_key_path as string | undefined,
        enabled: Boolean(data.enabled),
        availability: (data.availability as AnsibleComputer['availability']) || 'UNKNOWN',
        group: String(data.group ?? ''),
        subgroup: String(data.subgroup ?? ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        notes: String(data.notes ?? ''),
        created_at: String(data.created_at ?? ''),
        updated_at: String(data.updated_at ?? ''),
        last_seen_at: String(data.last_seen_at ?? data.last_seen ?? ''),
        last_error_at: data.last_error_at as string | undefined,
        last_linked_at: data.last_linked_at as string | undefined,
        last_run_id: data.last_run_id as string | undefined,
        last_run_action: data.last_run_action as string | undefined,
        last_run_rc: data.last_run_rc as number | undefined,
        last_log_level: data.last_log_level as string | undefined,
        last_log_message: data.last_log_message as string | undefined,
        last_log_source: data.last_log_source as string | undefined,
        last_error_message: data.last_error_message as string | undefined,
        linked_worker_id: data.linked_worker_id as string | undefined,
    };
}

function normalizeIP(value: string | undefined): string {
    return (value || '').trim().toLowerCase();
}

function workerMatchesComputer(worker: WorkerStatus, computer: AnsibleComputer): boolean {
    const compHost = normalizeIP(computer.host);
    const workerID = String(worker.worker_id || '').trim().toLowerCase();
    const workerIP = normalizeIP(worker.ip_address || worker.ip || worker.host);

    if (!compHost) return false;
    if (workerIP && workerIP === compHost) return true;
    if (workerID === compHost) return true;
    if (workerID === `host_${compHost}`) return true;
    if (computer.linked_worker_id && workerID === computer.linked_worker_id.trim().toLowerCase()) return true;
    return false;
}

function enrichComputersWithHeartbeat(computers: AnsibleComputer[], workers: WorkerStatus[]): AnsibleComputer[] {
    if (workers.length === 0) return computers;
    return computers.map((computer) => {
        const matched = workers.find((w) => workerMatchesComputer(w, computer));
        if (!matched) return computer;
        const hb = String(matched.last_heartbeat || matched.logged_at || '').trim();
        if (!hb) return computer;
        if (computer.last_seen_at && computer.last_seen_at.trim() !== '') return computer;
        return { ...computer, last_seen_at: hb };
    });
}

// Fetch worker status data
async function fetchWorkersStatus(): Promise<WorkerStatus[]> {
    try {
        const data = await fetchJSON<{ workers: WorkerStatus[] }>('/api/v1/workers/status');
        return data.workers || [];
    } catch (e) {
        console.warn('[Ansible] Failed to fetch workers status:', e);
        return [];
    }
}

export function useAnsibleComputers(intervalMs = 30000): AnsibleComputersData {
    const [computers, setComputers] = useState<AnsibleComputer[]>([]);
    const [computersMap, setComputersMap] = useState<Record<string, AnsibleComputer>>({});
    const [runs, setRuns] = useState<AnsibleRun[]>([]);
    const [logs] = useState<Record<string, AnsibleComputerLog[]>>({});
    const [workersStatus, setWorkersStatus] = useState<WorkerStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<number | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            // Fetch computers from API
            const rawData = await fetchJSON<Record<string, unknown>>('/api/v1/admin/ansible/computers/list');
            // API can return { computers: Array } (Go) or { computers: {id: data} } / record (legacy)
            let computersList: AnsibleComputer[];
            if (rawData && Array.isArray(rawData.computers)) {
                computersList = (rawData.computers as Record<string, unknown>[]).map((data) =>
                    transformComputer(String(data.id ?? data.host ?? ''), data)
                );
            } else if (rawData && typeof rawData.computers === 'object' && rawData.computers !== null && !Array.isArray(rawData.computers)) {
                const computersData = rawData.computers as Record<string, Record<string, unknown>>;
                computersList = Object.entries(computersData).map(([id, data]) => transformComputer(id, data));
            } else {
                const computersData = (rawData || {}) as Record<string, Record<string, unknown>>;
                computersList = Object.entries(computersData).filter(([k]) => k !== 'ok' && k !== 'count').map(([id, data]) => transformComputer(id, data));
            }

            // Build map
            const computersMapData: Record<string, AnsibleComputer> = {};
            computersList.forEach(c => { computersMapData[c.id] = c; });

            // Try to fetch runs (may not exist)
            try {
                const runsData = await fetchJSON<AnsibleRun[]>('/api/v1/ansible/runs');
                setRuns(runsData);
            } catch {
                // Runs endpoint might not exist, ignore
                setRuns([]);
            }

            // Fetch workers status for real-time heartbeat data
            const workers = await fetchWorkersStatus();
            setWorkersStatus(workers);
            const merged = enrichComputersWithHeartbeat(computersList, workers);

            const mergedMap: Record<string, AnsibleComputer> = {};
            merged.forEach(c => { mergedMap[c.id] = c; });

            setComputers(merged);
            setComputersMap(mergedMap);

            setError(null);
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : 'Fetch error';
            console.error('[Ansible] Data fetch error:', errorMsg);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, []);


    // Fetch logs for a specific computer
    const fetchComputerLogs = useCallback(async (computerId: string): Promise<AnsibleComputerLog[]> => {
        try {
            return await ansibleApi.computerLogs(computerId, 200) as AnsibleComputerLog[];
        } catch (e) {
            console.error('[Ansible] Failed to fetch logs for', computerId, ':', e);
            return [];
        }
    }, []);

    useEffect(() => {
        fetchAll();
        intervalRef.current = window.setInterval(fetchAll, intervalMs);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchAll, intervalMs]);

    return {
        computers,
        computersMap,
        runs,
        logs,
        workersStatus,
        loading,
        error,
        refresh: fetchAll,
        fetchComputerLogs
    };
}

// Capability-driven UI: Hook for fetching available actions from backend
export interface CapabilitiesData {
    capabilities: ActionCapability[];
    ansibleReady: boolean;
    playbooksDir: string;
    version: string;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

// Default capabilities fallback (when backend unavailable)
const DEFAULT_CAPABILITIES: ActionCapability[] = [
    { name: 'preflight_workers', playbook: 'preflight_workers.yml', available: false, reason: 'Backend non connesso' },
    { name: 'update_workers', playbook: 'update_workers.yml', available: false, reason: 'Backend non connesso' },
    { name: 'install_workers', playbook: 'install_workers.yml', available: false, reason: 'Backend non connesso' },
    { name: 'restart_workers', playbook: 'restart_workers.yml', available: false, reason: 'Backend non connesso' },
];

export function useCapabilities(): CapabilitiesData {
    const [capabilities, setCapabilities] = useState<ActionCapability[]>(DEFAULT_CAPABILITIES);
    const [ansibleReady, setAnsibleReady] = useState(false);
    const [playbooksDir, setPlaybooksDir] = useState('');
    const [version, setVersion] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCapabilities = useCallback(async () => {
        try {
            const raw = await ansibleApi.capabilities() as CapabilitiesResponse | { success?: boolean; data?: CapabilitiesResponse };
            const response = (raw && typeof raw === 'object' && 'data' in raw && raw.data) ? raw.data : (raw as CapabilitiesResponse);
            setCapabilities(response.actions || DEFAULT_CAPABILITIES);
            setAnsibleReady(response.ansible_ready ?? false);
            setPlaybooksDir(response.playbooks_dir ?? '');
            setVersion(response.version ?? '');
            setError(null);
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to fetch capabilities';
            console.warn('[Capabilities] Failed:', errorMsg);
            setError(errorMsg);
            // Keep default capabilities (all unavailable)
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCapabilities();
    }, [fetchCapabilities]);

    return {
        capabilities,
        ansibleReady,
        playbooksDir,
        version,
        loading,
        error,
        refresh: fetchCapabilities,
    };
}

// Action execution
export async function runAnsibleAction(
    action: string,
    computerIds: string[]
): Promise<{ run_id: string }> {
    return ansibleApi.runAction(computerIds, action);
}

// Shell command execution
export async function runAnsibleShell(
    command: string,
    computerIds: string[]
): Promise<{ run_id: string }> {
    return ansibleApi.runShell(computerIds, command);
}

// Test SSH connection
export async function testAnsibleSSH(
    computerIds: string[]
): Promise<{ run_id: string }> {
    // Test SSH uses run_action under the hood with 'test_ssh' action
    return ansibleApi.runAction(computerIds, 'test_ssh');
}

// Delete computer
export async function deleteAnsibleComputer(computerId: string): Promise<void> {
    return ansibleApi.deleteComputer(computerId);
}

// Add/Update computer
export async function saveAnsibleComputer(
    computer: Partial<AnsibleComputer>
): Promise<AnsibleComputer> {
    return ansibleApi.saveComputer(computer as Record<string, unknown>) as Promise<AnsibleComputer>;
}
