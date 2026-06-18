/**
 * Stream Lifecycle Controls Component
 * 
 * Gestisce le transizioni di stato dello stream:
 * - Created → Testing (preview mode)
 * - Testing → Live (go live)
 * - Live → Complete (end stream)
 * - Qualsiasi stato → Revoked (delete)
 * 
 * Include anche controlli per:
 * - Visualizzare stato attuale
 * - Conferma azioni critiche
 * - Auto-refresh stato
 */

import React, { useState, useEffect, useCallback } from 'react';
import { livestreamApi, type LivestreamStatus } from '../../lib/api';

interface LifecycleControlsProps {
  streamId: string;
  currentStatus: LivestreamStatus;
  onStatusChange?: (newStatus: LivestreamStatus) => void;
  disabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface TransitionState {
  loading: boolean;
  error?: string;
  confirmAction?: LivestreamStatus | 'delete';
}

// Type guard to check if action is a valid transition action (not 'delete')
const isTransitionAction = (action: string): action is 'testing' | 'live' | 'complete' => {
  return action === 'testing' || action === 'live' || action === 'complete';
};

const statusConfig: Record<LivestreamStatus, { label: string; color: string; icon: string; description: string }> = {
  created: {
    label: 'Created',
    color: 'bg-blue-500',
    icon: 'fiber_new',
    description: 'Stream created, waiting to start testing',
  },
  testing: {
    label: 'Testing',
    color: 'bg-yellow-500',
    icon: 'preview',
    description: 'Stream in preview mode, not yet public',
  },
  live: {
    label: 'Live',
    color: 'bg-red-500',
    icon: 'sensors',
    description: 'Stream is live and publicly visible',
  },
  complete: {
    label: 'Complete',
    color: 'bg-green-500',
    icon: 'check_circle',
    description: 'Stream has ended successfully',
  },
  revoked: {
    label: 'Revoked',
    color: 'bg-gray-500',
    icon: 'cancel',
    description: 'Stream has been cancelled',
  },
};

const transitions: Record<LivestreamStatus, Array<{ action: LivestreamStatus; label: string; icon: string; primary?: boolean; danger?: boolean }>> = {
  created: [
    { action: 'testing', label: 'Start Testing', icon: 'settings_suggest', primary: true },
    { action: 'revoked', label: 'Cancel', icon: 'cancel', danger: true },
  ],
  testing: [
    { action: 'live', label: 'Go Live', icon: 'sensors', primary: true },
    { action: 'complete', label: 'End Preview', icon: 'stop' },
  ],
  live: [
    { action: 'complete', label: 'End Stream', icon: 'stop', danger: true },
  ],
  complete: [],
  revoked: [],
};

export const LifecycleControls: React.FC<LifecycleControlsProps> = ({
  streamId,
  currentStatus,
  onStatusChange,
  disabled = false,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [transitionState, setTransitionState] = useState<TransitionState>({ loading: false });
  const [status, setStatus] = useState<LivestreamStatus>(currentStatus);

  // Auto-refresh status
  useEffect(() => {
    if (!autoRefresh || status !== 'live') return;

    const interval = setInterval(async () => {
      try {
        const result = await livestreamApi.status(streamId);
        if (result.status && result.status !== status) {
          setStatus(result.status);
          onStatusChange?.(result.status);
        }
      } catch (err) {
        console.error('Failed to refresh status:', err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [streamId, status, autoRefresh, refreshInterval, onStatusChange]);

  const handleTransition = useCallback(async (action: 'testing' | 'live' | 'complete') => {
    setTransitionState({ loading: true, error: undefined, confirmAction: undefined });
    
    try {
      let result;
      if (action === 'testing') {
        result = await livestreamApi.startTesting(streamId);
      } else if (action === 'live') {
        result = await livestreamApi.goLive(streamId);
      } else {
        result = await livestreamApi.endStream(streamId);
      }
      
      if (result.ok && result.status) {
        setStatus(result.status);
        onStatusChange?.(result.status);
      }
    } catch (err) {
      setTransitionState({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'Transition failed',
      });
      return;
    }
    
    setTransitionState({ loading: false });
  }, [streamId, onStatusChange]);

  const handleDelete = useCallback(async () => {
    setTransitionState({ loading: true, error: undefined, confirmAction: undefined });
    
    try {
      await livestreamApi.delete(streamId);
      setStatus('revoked');
      onStatusChange?.('revoked');
    } catch (err) {
      setTransitionState({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'Delete failed',
      });
      return;
    }
    
    setTransitionState({ loading: false });
  }, [streamId, onStatusChange]);

  const config = statusConfig[status];
  const availableTransitions = transitions[status];

  return (
    <div className="space-y-4">
      {/* Current Status Badge */}
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg ${config.color}/10 border border-${config.color}/30 flex items-center gap-2`}>
          <span className={`w-2.5 h-2.5 rounded-full ${config.color} ${status === 'live' ? 'animate-pulse' : ''}`}></span>
          <span className={`text-sm font-medium ${config.color.replace('bg-', 'text-')}`}>
            {config.label}
          </span>
          <span className="material-icons text-base text-text-muted">{config.icon}</span>
        </div>
        {transitionState.loading && (
          <span className="material-icons animate-spin text-primary">sync</span>
        )}
      </div>

      {/* Status Description */}
      <p className="text-sm text-text-secondary">{config.description}</p>

      {/* Error Message */}
      {transitionState.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <span className="material-icons text-red-400">error</span>
          <span className="text-sm text-red-400">{transitionState.error}</span>
        </div>
      )}

      {/* Confirmation Dialog */}
      {transitionState.confirmAction && (
        <div className="p-4 rounded-lg bg-surface-hover dark:bg-surface-dark-lighter border border-border">
          <p className="text-sm text-text-primary mb-3">
            {transitionState.confirmAction === 'testing' && 'Start testing mode? This will begin the preview stream.'}
            {transitionState.confirmAction === 'live' && 'Go live now? This will make your stream publicly visible.'}
            {transitionState.confirmAction === 'complete' && 'End the stream? This action cannot be undone.'}
            {transitionState.confirmAction === 'delete' && 'Delete this stream? This action cannot be undone.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (transitionState.confirmAction === 'delete') {
                  handleDelete();
                } else if (transitionState.confirmAction && isTransitionAction(transitionState.confirmAction)) {
                  handleTransition(transitionState.confirmAction);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                transitionState.confirmAction === 'delete' || transitionState.confirmAction === 'complete'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-primary hover:bg-primary/80 text-white'
              }`}
            >
              Confirm
            </button>
            <button
              onClick={() => setTransitionState({ loading: false, confirmAction: undefined })}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-surface dark:bg-surface-dark border border-border hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!transitionState.confirmAction && availableTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTransitions.map(({ action, label, icon, primary, danger }) => (
            <button
              key={action}
              onClick={() => setTransitionState({ loading: false, confirmAction: action })}
              disabled={disabled || transitionState.loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                primary
                  ? 'bg-primary hover:bg-primary/80 text-white shadow-lg shadow-primary/20'
                  : danger
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-surface-hover dark:bg-surface-dark-lighter hover:bg-surface-active border border-border'
              }`}
            >
              <span className="material-icons text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* No actions available */}
      {!transitionState.confirmAction && availableTransitions.length === 0 && status === 'complete' && (
        <p className="text-sm text-text-muted italic">
          Stream has ended. Create a new stream to go live again.
        </p>
      )}
    </div>
  );
};

export default LifecycleControls;