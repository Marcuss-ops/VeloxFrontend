/**
 * Stream Card Component
 * 
 * Card completa per visualizzare e gestire uno stream con:
 * - Thumbnail e info base
 * - Health indicator
 * - Lifecycle controls
 * - Statistiche viewers/duration
 * - Azioni rapide
 */

import React, { useState, useEffect, useCallback } from 'react';
import { livestreamApi, type Livestream, type LivestreamStatus } from '../../lib/api';
import { StreamHealthIndicator } from './StreamHealthIndicator';
import { LifecycleControls } from './LifecycleControls';

interface StreamCardProps {
  stream: Livestream;
  onEdit?: (stream: Livestream) => void;
  onDelete?: (streamId: string) => void;
  onStatusChange?: (streamId: string, newStatus: LivestreamStatus) => void;
  showDetails?: boolean;
}

const platformIcons: Record<string, { icon: string; color: string }> = {
  youtube: { icon: 'video_library', color: 'text-gray-400' },
  twitch: { icon: 'videogame_asset', color: 'text-purple-500' },
  facebook: { icon: 'facebook', color: 'text-blue-500' },
  custom: { icon: 'cast', color: 'text-gray-500' },
};

// Helper per formattare durata
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

// Helper per formattare data
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const StreamCard: React.FC<StreamCardProps> = ({
  stream,
  onEdit,
  onDelete,
  onStatusChange,
  showDetails = false,
}) => {
  const [expanded, setExpanded] = useState(showDetails);
  const [health, setHealth] = useState(stream.health);
  const [viewers, setViewers] = useState(stream.viewers);
  
  const platform = platformIcons[stream.platform] || platformIcons.custom;

  // Auto-refresh health for live streams
  useEffect(() => {
    if (stream.status !== 'live') return;

    const interval = setInterval(async () => {
      try {
        const result = await livestreamApi.health(stream.id);
        if (result.health) {
          setHealth(result.health);
        }
        
        const stats = await livestreamApi.getStats(stream.id);
        if (stats.viewers !== undefined) {
          setViewers(stats.viewers);
        }
      } catch (err) {
        console.error('Failed to refresh health:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [stream.id, stream.status]);

  const handleStatusChange = useCallback((newStatus: LivestreamStatus) => {
    onStatusChange?.(stream.id, newStatus);
  }, [stream.id, onStatusChange]);

  const handleDelete = useCallback(async () => {
    try {
      await livestreamApi.delete(stream.id);
      onDelete?.(stream.id);
    } catch (err) {
      console.error('Failed to delete stream:', err);
    }
  }, [stream.id, onDelete]);

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark shadow-sm overflow-hidden hover:border-primary/30 transition-colors">
      {/* Thumbnail Section */}
      <div className="relative aspect-video bg-black">
        {stream.thumbnail ? (
          <img
            src={stream.thumbnail}
            alt={stream.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-hover to-surface-dark">
            <span className="material-icons text-4xl text-text-muted">videocam</span>
          </div>
        )}

        {/* Status Overlay */}
        <div className="absolute top-2 left-2">
          {stream.status === 'live' && (
            <span className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Live
            </span>
          )}
          {stream.status === 'testing' && (
            <span className="px-2 py-1 rounded bg-yellow-500 text-black text-xs font-bold uppercase flex items-center gap-1">
              <span className="material-icons text-sm">preview</span>
              Preview
            </span>
          )}
          {stream.status === 'complete' && (
            <span className="px-2 py-1 rounded bg-green-500 text-white text-xs font-bold uppercase">
              Completed
            </span>
          )}
        </div>

        {/* Platform Badge */}
        <div className="absolute top-2 right-2">
          <span className={`material-icons ${platform.color}`}>{platform.icon}</span>
        </div>

        {/* Viewers/Live Stats */}
        {stream.status === 'live' && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
              <span className="material-icons text-sm">visibility</span>
              {viewers.toLocaleString()} viewers
            </div>
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
              <span className="material-icons text-sm">schedule</span>
              {formatDuration(stream.duration)}
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate">{stream.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Created {formatDate(stream.created_at)}
            </p>
          </div>
          <button
            onClick={() => onEdit?.(stream)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-primary transition-colors"
          >
            <span className="material-icons text-lg">edit</span>
          </button>
        </div>

        {/* Health Indicator (for live/testing) */}
        {(stream.status === 'live' || stream.status === 'testing') && health && (
          <StreamHealthIndicator
            status={health.status}
            bitrate={health.bitrate}
            framerate={health.framerate}
            resolution={health.resolution}
            packetsLost={health.packets_lost}
            message={health.message}
            compact={!expanded}
          />
        )}

        {/* Quick Stats */}
        {stream.status !== 'created' && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-surface-hover dark:bg-surface-dark-lighter">
              <div className="text-lg font-semibold text-text-primary">
                {stream.max_viewers > 0 ? stream.max_viewers.toLocaleString() : '-'}
              </div>
              <div className="text-xs text-text-muted">Max Viewers</div>
            </div>
            <div className="p-2 rounded-lg bg-surface-hover dark:bg-surface-dark-lighter">
              <div className="text-lg font-semibold text-text-primary">
                {formatDuration(stream.duration)}
              </div>
              <div className="text-xs text-text-muted">Duration</div>
            </div>
            <div className="p-2 rounded-lg bg-surface-hover dark:bg-surface-dark-lighter">
              <div className="text-lg font-semibold text-text-primary capitalize">
                {stream.latency_preference}
              </div>
              <div className="text-xs text-text-muted">Latency</div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors py-1"
        >
          <span>{expanded ? 'Less' : 'More'}</span>
          <span className="material-icons text-sm">{expanded ? 'expand_less' : 'expand_more'}</span>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="pt-3 border-t border-border space-y-4">
            {/* Lifecycle Controls */}
            <LifecycleControls
              streamId={stream.id}
              currentStatus={stream.status}
              onStatusChange={handleStatusChange}
              autoRefresh={stream.status === 'live'}
            />

            {/* Stream Info */}
            <div className="space-y-2 text-xs">
              {stream.description && (
                <p className="text-text-secondary">{stream.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-icons text-sm text-text-muted">settings_input_antenna</span>
                  <span className="text-text-secondary">Bitrate:</span>
                  <span className="text-text-primary">{stream.video_bitrate} kbps</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-icons text-sm text-text-muted">graphic_eq</span>
                  <span className="text-text-secondary">Audio:</span>
                  <span className="text-text-primary">{stream.audio_bitrate} kbps</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-icons text-sm text-text-muted">protocol</span>
                  <span className="text-text-secondary">Protocol:</span>
                  <span className="text-text-primary uppercase">{stream.protocol}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-icons text-sm text-text-muted">child_care</span>
                  <span className="text-text-secondary">For Kids:</span>
                  <span className="text-text-primary">{stream.is_for_kids ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Delete Button */}
            {stream.status !== 'live' && (
              <button
                onClick={handleDelete}
                className="w-full py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-icons text-base">delete</span>
                Delete Stream
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamCard;