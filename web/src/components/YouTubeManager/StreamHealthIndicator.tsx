/**
 * Stream Health Indicator Component
 * 
 * Visualizza lo stato di salute dello stream con:
 * - Indicatore visuale di stato (colore e animazione)
 * - Metriche bitrate, framerate, resolution
 * - Messaggi di errore/warning
 */

import React from 'react';
import type { LivestreamHealthStatus } from '../../lib/api';

interface StreamHealthIndicatorProps {
  status: LivestreamHealthStatus;
  bitrate?: number;
  framerate?: number;
  resolution?: string;
  packetsLost?: number;
  message?: string;
  compact?: boolean;
}

const healthConfig = {
  good: {
    color: 'bg-green-500',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'check_circle',
    label: 'Excellent',
    pulse: true,
  },
  ok: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: 'warning',
    label: 'Fair',
    pulse: true,
  },
  bad: {
    color: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: 'error',
    label: 'Poor',
    pulse: true,
  },
  error: {
    color: 'bg-gray-500',
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    icon: 'cloud_off',
    label: 'No Signal',
    pulse: false,
  },
};

export const StreamHealthIndicator: React.FC<StreamHealthIndicatorProps> = ({
  status,
  bitrate,
  framerate,
  resolution,
  packetsLost,
  message,
  compact = false,
}) => {
  const config = healthConfig[status];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor} border ${config.borderColor}`}>
        <span className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}></span>
        <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}></span>
          <span className={`text-sm font-medium ${config.textColor}`}>Stream Health: {config.label}</span>
        </div>
        <span className="material-icons text-base text-text-muted">{config.icon}</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {bitrate !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="material-icons text-sm text-text-muted">speed</span>
            <span className="text-text-secondary">Bitrate:</span>
            <span className="text-text-primary font-medium">{(bitrate / 1000).toFixed(1)} Mbps</span>
          </div>
        )}
        {framerate !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="material-icons text-sm text-text-muted">videocam</span>
            <span className="text-text-secondary">FPS:</span>
            <span className="text-text-primary font-medium">{framerate}</span>
          </div>
        )}
        {resolution && (
          <div className="flex items-center gap-1.5">
            <span className="material-icons text-sm text-text-muted">high_quality</span>
            <span className="text-text-secondary">Resolution:</span>
            <span className="text-text-primary font-medium">{resolution}</span>
          </div>
        )}
        {packetsLost !== undefined && packetsLost > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="material-icons text-sm text-red-400">warning</span>
            <span className="text-text-secondary">Packets Lost:</span>
            <span className="text-red-400 font-medium">{packetsLost}</span>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-text-secondary">{message}</p>
        </div>
      )}
    </div>
  );
};

export default StreamHealthIndicator;