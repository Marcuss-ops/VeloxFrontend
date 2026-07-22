/**
 * VeloxJobDetailView - Unified view of a Velox rendering job and its
 * associated social publishing deliveries.
 *
 * Data comes from the InstaEdit BFF endpoint
 *   GET /api/v1/velox/jobs/{id}
 * which returns the aggregated { job, deliveries } shape.
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVeloxJobDetail } from './hooks/useVeloxJobDetail';
import { getDeliveryEventTimeline } from '@/lib/api/veloxApi';
import type { VeloxDelivery } from '@/lib/api/veloxApi';
import { useSocialDestinations } from '@/hooks/useSocialDestinations';
import type { SocialDestination } from '@/lib/api/socialDestinationsApi';

const statusBadge = (status: string) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  const configs: Record<string, { label: string; color: string; bg: string; icon: string; animate: boolean }> = {
    PENDING: { label: 'In attesa', color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20', icon: 'hourglass_empty', animate: false },
    PROCESSING: { label: 'Rendering', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: 'movie', animate: true },
    SUCCEEDED: { label: 'Completato', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: 'check_circle', animate: false },
    FAILED: { label: 'Fallito', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: 'error', animate: false },
    CANCELLED: { label: 'Annullato', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: 'cancel', animate: false },
    DEAD: { label: 'Dead letter', color: 'text-red-500', bg: 'bg-red-600/10 border-red-600/20', icon: 'report', animate: false },
  };
  return configs[normalized] || { label: status, color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20', icon: 'help', animate: false };
};

const deliveryStatusBadge = (status: string) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    PUBLISHED: { label: 'Pubblicato', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: 'check_circle' },
    PUBLISHING: { label: 'In pubblicazione', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: 'publish' },
    QUEUED: { label: 'In coda', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: 'queue' },
    FAILED: { label: 'Pubblicazione fallita', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: 'error' },
    BLOCKED_AUTH: { label: 'Bloccato (auth)', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: 'key_off' },
    ARTIFACT_VERIFIED: { label: 'Verificato', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: 'verified' },
  };
  return configs[normalized] || { label: status, color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20', icon: 'help' };
};

const formatDate = (value: string | undefined) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
};

const DeliveryRow: React.FC<{ delivery: VeloxDelivery; index: number; destination?: SocialDestination }> = ({ delivery, index, destination }) => {
  const badge = deliveryStatusBadge(delivery.status);
  const displayLabel = destination?.label || destination?.external_destination_id || delivery.externalDestinationId;
  const displayProvider = destination?.provider;
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-500 text-xs font-mono">#{index + 1}</span>
          <span className="text-slate-200 font-medium text-sm truncate" title={delivery.externalDestinationId}>
            {displayLabel}
            {displayProvider && (
              <span className="text-slate-500 text-xs font-normal ml-1">({displayProvider})</span>
            )}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${badge.bg} ${badge.color}`}>
          <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
          {badge.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {delivery.socialDeliveryId ? (
          <span className="font-mono bg-slate-900/50 px-2 py-1 rounded">{delivery.socialDeliveryId}</span>
        ) : (
          <span className="italic">Social delivery ID non ancora assegnato</span>
        )}
        {delivery.platformMediaId && (
          <span className="font-mono bg-slate-900/50 px-2 py-1 rounded" title="Platform media ID">
            media: {delivery.platformMediaId}
          </span>
        )}
      </div>

      {delivery.platformUrl && (
        <a
          href={delivery.platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 hover:underline w-fit"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Visualizza sul social
        </a>
      )}

      {/* Delivery event timeline */}
      <div className="mt-2 pt-3 border-t border-slate-700/50">
        <DeliveryEventTimeline status={delivery.status} />
      </div>
    </div>
  );
};

const DeliveryEventTimeline: React.FC<{ status: string }> = ({ status }) => {
  const events = getDeliveryEventTimeline(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {events.map((event, idx) => (
        <React.Fragment key={event.key}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
              event.active
                ? 'bg-primary/10 border-primary/30 text-primary'
                : event.completed
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-slate-700/30 border-slate-700/50 text-slate-500'
            }`}
            title={event.completed ? 'Completato' : event.active ? 'In corso' : 'In attesa'}
          >
            <span className="material-symbols-outlined text-[14px]">{event.icon}</span>
            <span>{event.label}</span>
          </div>
          {idx < events.length - 1 && events[idx + 1]?.key !== 'failed' && (
            <span className="text-slate-600 material-symbols-outlined text-[14px]">chevron_right</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const VeloxJobDetailView: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, deliveries, loading, error, refresh } = useVeloxJobDetail(jobId);
  const { destinations: socialDestinations } = useSocialDestinations({ enabled: Boolean(jobId) });

  const destinationMap = useMemo(() => {
    const map = new Map<string, SocialDestination>();
    socialDestinations.forEach((d) => map.set(d.external_destination_id, d));
    return map;
  }, [socialDestinations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-primary animate-spin">progress_activity</span>
          <span className="text-slate-400">Caricamento job Velox...</span>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
          <span className="text-slate-400">{error}</span>
          <div className="flex gap-3">
            <button onClick={() => refresh()} className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              Riprova
            </button>
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors">
              Torna indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const renderBadge = statusBadge(job.renderStatus);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800/80 px-6 py-4 bg-white dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary">movie</span>
          <h2 className="text-lg font-bold leading-tight tracking-tight">Velox Job Detail</h2>
        </div>
        <div className="flex items-center gap-6">
          <button className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 size-2 bg-primary rounded-full"></span>
          </button>
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border-slate-200 dark:border-slate-700 bg-slate-300 dark:bg-slate-600" />
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-2 text-sm font-medium">
          <button onClick={() => navigate('/analytics')} className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">home</span>
            Dashboard
          </button>
          <span className="text-slate-300 dark:text-slate-600 material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-slate-900 dark:text-slate-100 truncate max-w-xs" title={job.id}>
            Job {job.id.slice(0, 12)}...
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{job.projectId || 'Untitled Project'}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${renderBadge.bg} ${renderBadge.color} text-sm font-semibold`}>
              <span className={`material-symbols-outlined text-[16px] ${renderBadge.animate ? 'animate-pulse' : ''}`}>{renderBadge.icon}</span>
              {renderBadge.label}
            </span>
          </div>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Aggiorna
          </button>
        </div>

        {/* Render status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Stato Rendering</div>
            <div className={`text-lg font-bold ${renderBadge.color} flex items-center gap-2`}>
              <span className="material-symbols-outlined text-[20px]">{renderBadge.icon}</span>
              {renderBadge.label}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Creato</div>
            <div className="text-sm font-medium text-slate-200">{formatDate(job.createdAt)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Ultimo aggiornamento</div>
            <div className="text-sm font-medium text-slate-200">{formatDate(job.updatedAt)}</div>
          </div>
        </div>

        {/* Deliveries */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">share</span>
              Stato Pubblicazione
            </h3>
            <span className="text-xs text-slate-500 font-medium">{deliveries.length} destinazioni</span>
          </div>

          {deliveries.length === 0 ? (
            <div className="text-center py-10 text-slate-500 italic border-2 border-dashed border-slate-700 rounded-xl">
              Nessuna destinazione collegata a questo job.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {deliveries.map((delivery, idx) => (
                <DeliveryRow
                  key={delivery.socialDeliveryId || `${delivery.externalDestinationId}-${idx}`}
                  delivery={delivery}
                  index={idx}
                  destination={destinationMap.get(delivery.externalDestinationId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="flex justify-start">
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Torna alla dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default VeloxJobDetailView;
