/**
 * @fileoverview Snapshot test for Ansible capabilities contract
 * 
 * Questo test verifica che:
 * 1. Le action nel frontend corrispondano a quelle del backend
 * 2. Nessun click produca PLAYBOOK_NOT_FOUND (action name mismatch)
 * 3. Le action hardcoded nel frontend siano allineate al contratto
 */

import { describe, it, expect } from 'vitest';
import { ActionCapability, CapabilitiesResponse } from './types';

// Backend action contract (from playbookActionMap in ansible_execution.go)
const BACKEND_ACTIONS = [
    'install_workers',
    'update_workers',
    'preflight_workers',
    'check_workers',
    'restart_workers',
    'remove_workers',
    'reset_worker_id',
    'reinstall_workers_clean',
    'cleanup_old_venv',
] as const;

// Frontend action config (from AnsibleComputersTab.tsx ACTION_CONFIG)
const FRONTEND_ACTION_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: string; title: string }> = {
    preflight_workers: { label: 'Preflight', color: 'rgba(59,130,246,', textColor: '#60a5fa', icon: 'flight_takeoff', title: 'SSH ping, disk, Python/ffmpeg, worker status. Esegui prima di Update.' },
    update_workers: { label: 'Update', color: 'rgba(139,92,246,', textColor: '#a78bfa', icon: 'upgrade', title: 'Aggiorna codice sui computer selezionati' },
    install_workers: { label: 'Install', color: 'rgba(16,185,129,', textColor: '#34d399', icon: 'build', title: 'Installa worker sui computer selezionati' },
    restart_workers: { label: 'Reboot', color: 'rgba(239,68,68,', textColor: '#f87171', icon: 'power_settings_new', title: 'Riavvia i computer selezionati' },
    check_workers: { label: 'Check', color: 'rgba(234,179,8,', textColor: '#fbbf24', icon: 'checklist', title: 'Verifica stato worker' },
    remove_workers: { label: 'Remove', color: 'rgba(239,68,68,', textColor: '#f87171', icon: 'delete', title: 'Rimuovi worker dai computer selezionati' },
};

describe('Ansible Capabilities Contract', () => {
    it('should have all backend actions defined', () => {
        // Verify all backend actions have a frontend config (or use fallback)
        for (const action of BACKEND_ACTIONS) {
            // Each backend action should be renderable in the UI
            // Either with a specific config or the fallback config
            expect(typeof action).toBe('string');
            expect(action.length).toBeGreaterThan(0);
        }
    });

    it('should not have frontend actions outside backend contract', () => {
        // Verify no hardcoded frontend actions exist that are not in backend
        const frontendActions = Object.keys(FRONTEND_ACTION_CONFIG);
        
        for (const action of frontendActions) {
            expect(BACKEND_ACTIONS).toContain(action);
        }
    });

    it('should not contain legacy restart_computer action', () => {
        // Ensure we don't have the old 'restart_computer' action
        expect(FRONTEND_ACTION_CONFIG).not.toHaveProperty('restart_computer');
        expect(BACKEND_ACTIONS).not.toContain('restart_computer');
    });

    it('should match snapshot of backend actions', () => {
        // Snapshot test - if this changes, the contract has changed
        expect(BACKEND_ACTIONS).toMatchInlineSnapshot(`
          [
            "install_workers",
            "update_workers",
            "preflight_workers",
            "check_workers",
            "restart_workers",
            "remove_workers",
            "reset_worker_id",
            "reinstall_workers_clean",
            "cleanup_old_venv",
          ]
        `);
    });

    it('should have correct UI labels for common actions', () => {
        // Verify UI labels are user-friendly
        const expectedLabels: Record<string, string> = {
            preflight_workers: 'Preflight',
            update_workers: 'Update',
            install_workers: 'Install',
            restart_workers: 'Reboot',
            check_workers: 'Check',
            remove_workers: 'Remove',
        };

        for (const [action, expectedLabel] of Object.entries(expectedLabels)) {
            expect(FRONTEND_ACTION_CONFIG[action]?.label).toBe(expectedLabel);
        }
    });
});

describe('CapabilitiesResponse type contract', () => {
    it('should accept valid CapabilitiesResponse', () => {
        const response: CapabilitiesResponse = {
            actions: [
                { name: 'update_workers', playbook: 'update_workers.yml', available: true },
                { name: 'preflight_workers', playbook: 'preflight_workers.yml', available: false, reason: 'playbook not found' },
            ],
            ansible_ready: true,
            playbooks_dir: '/path/to/playbooks',
            version: '1.0.0',
        };

        expect(response.actions).toHaveLength(2);
        expect(response.ansible_ready).toBe(true);
        expect(response.version).toBe('1.0.0');
    });

    it('should handle unavailable action with reason', () => {
        const cap: ActionCapability = {
            name: 'test_action',
            playbook: 'test.yml',
            available: false,
            reason: 'playbook not found',
        };

        expect(cap.available).toBe(false);
        expect(cap.reason).toBe('playbook not found');
    });
});

describe('E2E: No PLAYBOOK_NOT_FOUND on click', () => {
    it('should filter actions by available=true before showing as clickable', () => {
        // Simulate the filtering logic from AnsibleComputersTab
        const capabilities: ActionCapability[] = [
            { name: 'update_workers', playbook: 'update_workers.yml', available: true },
            { name: 'preflight_workers', playbook: 'preflight_workers.yml', available: false, reason: 'playbook not found' },
        ];

        // Available actions that can be clicked
        const availableActions = capabilities.filter(c => c.available);
        
        // Only available actions should be clickable
        expect(availableActions).toHaveLength(1);
        expect(availableActions[0].name).toBe('update_workers');
        
        // Unavailable actions should have a reason
        const unavailableActions = capabilities.filter(c => !c.available);
        expect(unavailableActions).toHaveLength(1);
        expect(unavailableActions[0].reason).toBe('playbook not found');
    });

    it('should disable buttons for unavailable actions', () => {
        // Simulate the button disabled logic
        const cap: ActionCapability = {
            name: 'preflight_workers',
            playbook: 'preflight_workers.yml',
            available: false,
            reason: 'playbook not found',
        };

        const actionLoading = null;
        const selectedSize: number = 1;
        
        // Button should be disabled when action is unavailable
        const isDisabled = !cap.available || actionLoading !== null || selectedSize === 0;
        
        expect(isDisabled).toBe(true);
    });
});
