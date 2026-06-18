// Capability-driven UI types (10_UI_CAPABILITY_DRIVEN.md)

export interface ActionCapability {
    name: string;
    playbook: string;
    available: boolean;
    reason?: string; // e.g., "playbook not found", "ansible not installed"
}

export interface CapabilitiesResponse {
    actions: ActionCapability[];
    ansible_ready: boolean;
    playbooks_dir: string;
    version: string; // contract version for UI/backend compatibility
}

export type AnsibleComputerAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';

export interface AnsibleComputer {
    id: string;
    host: string;
    ansible_user: string;
    ssh_password?: string;
    ssh_key_path?: string;
    enabled: boolean;
    availability: AnsibleComputerAvailability;
    group: string;
    subgroup: string;
    tags: string[];
    notes: string;

    // Timestamps
    created_at: string;
    updated_at: string;
    last_seen_at: string;
    last_error_at?: string;
    last_linked_at?: string;

    // Last run info
    last_run_id?: string;
    last_run_action?: string;
    last_run_rc?: number;
    last_log_level?: string;
    last_log_message?: string;
    last_log_source?: string;
    last_error_message?: string;

    // Linked worker
    linked_worker_id?: string;
}

export type AnsibleTab = 'computers' | 'logs' | 'actions' | 'shell';

export interface AnsibleRun {
    run_id: string;
    action: string;
    computer_ids: string[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    started_at: string;
    completed_at?: string;
    return_code?: number;
    output?: string;
    /** Preamble always printed at start of run log (ansibleDir, playbook_path, command, limit, hosts) */
    preamble?: string;
}

export interface AnsibleComputerLog {
    timestamp: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
    source: string;
    message: string;
}

// Worker status from /workers_status API - for real-time heartbeat/disk data
export interface WorkerStatus {
    worker_id: string;
    ip_address?: string;
    ip?: string;
    host?: string;
    status?: string;
    time_since_heartbeat?: number;
    last_heartbeat?: string;
    disk_free_gb?: number;
    cpu_load_1m?: number;
    ram_used_pct?: number;
    uptime_seconds?: number;
    active_jobs?: number;
    connection_status?: 'on' | 'off';
    logged_at?: string;
    problems_count?: number;
    recent_logs?: string[];
    recent_errors?: string[];
    code_version?: string;
    target_version?: string;
}
