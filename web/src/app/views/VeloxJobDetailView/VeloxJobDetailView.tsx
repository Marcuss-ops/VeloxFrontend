/**
 * VeloxJobDetailView - Unified view of a Velox rendering job and its
 * associated social publishing deliveries.
 *
 * Data comes from the InstaEdit BFF endpoint
 *   GET /api/v1/velox/jobs/{id}
 * which returns the aggregated { job, deliveries } shape.
 */

import React, { useMemo } from 'react';
import { AlertCircle, ArrowLeft, Bell, ChevronRight, ExternalLink, Film, Home, Loader2, RefreshCw, Share2, Hourglass, CheckCircle2, Upload, ListOrdered, KeyRound, BadgeCheck, HelpCircle, XCircle, Flag } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVeloxJobDetail } from './hooks/useVeloxJobDetail';
import { getDeliveryEventTimeline } from '@/lib/api/veloxApi';
import type { VeloxDelivery } from '@/lib/api/veloxApi';
import { useSocialDestinations } from '@/hooks/useSocialDestinations';
import type { SocialDestination } from '@/lib/api/socialDestinationsApi';

const statusBadge = (status: string) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  const configs: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; animate: boolean }> = {
    PENDING: { label: 'In attesa', color: 'text-foreground/70', bg: 'bg-white/10 border-white/20', icon: Hourglass, animate: false },
    PROCESSING: { label: 'Rendering', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Film, animate: true },
    SUCCEEDED: { label: 'Completato', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2, animate: false },
    FAILED: { label: 'Fallito', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertCircle, animate: false },
    CANCELLED: { label: 'Annullato', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: XCircle, animate: false },
    DEAD: { label: 'Dead letter', color: 'text-red-500', bg: 'bg-red-600/10 border-red-600/20', icon: Flag, animate: false },
  };
  return configs[normalized] || { label: status, color: 'text-foreground/70', bg: 'bg-white/10 border-white/20', icon: HelpCircle, animate: false };
};

const deliveryStatusBadge = (status: string) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  const configs: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    PUBLISHED: { label: 'Pubblicato', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
    PUBLISHING: { label: 'In pubblicazione', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Upload },
    QUEUED: { label: 'In coda', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: ListOrdered },
    FAILED: { label: 'Pubblicazione fallita', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertCircle },
    BLOCKED_AUTH: { label: 'Bloccato (auth)', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: KeyRound },
    ARTIFACT_VERIFIED: { label: 'Verificato', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: BadgeCheck },
  };
  return configs[normalized] || { label: status, color: 'text-foreground/70', bg: 'bg-white/10 border-white/20', icon: HelpCircle };
};

const formatDate = (value: string | undefined) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
};

const DeliveryRow: React.FC<{ delivery: VeloxDelivery; index: number; destination?: SocialDestination }> = ({ delivery, index, destination }) => {
  const badge = deliveryStatusBadge(delivery.status);
  const Icon = badge.icon;
  const displayLabel = destination?.label || destination?.external_destination_id || delivery.externalDestinationId;
  const displayProvider = destination?.provider;
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-card/50 border border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-muted-foreground text-xs font-mono">#{index + 1}</span>
          <span className="text-foreground/80 font-medium text-sm truncate" title={delivery.externalDestinationId}>
            {displayLabel}
            {displayProvider && (
              <span className="text-muted-foreground text-xs font-normal ml-1">({displayProvider})</span>
            )}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${badge.bg} ${badge.color}`}>
          <Icon className="size-3.5" />
          {badge.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {delivery.socialDeliveryId ? (
          <span className="font-mono bg-card/50 px-2 py-1 rounded">{delivery.socialDeliveryId}</span>
        ) : (
          <span className="italic">Social delivery ID non ancora assegnato</span>
        )}
        {delivery.platformMediaId && (
          <span className="font-mono bg-card/50 px-2 py-1 rounded" title="Platform media ID">
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
          <ExternalLink className="size-4 " />
          Visualizza sul social
        </a>
      )}

      {/* Delivery event timeline */}
      <div className="mt-2 pt-3 border-t border/50">
        <DeliveryEventTimeline status={delivery.status} />
      </div>
    </div>
  );
};

const DeliveryEventTimeline: React.FC<{ status: string }> = ({ status }) => {
  const events = getDeliveryEventTimeline(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {events.map((event, idx) => {
        const EventIcon = event.icon;
        return (
          <React.Fragment key={event.key}>
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
                event.active
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : event.completed
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-muted/30 border/50 text-muted-foreground'
              }`}
              title={event.completed ? 'Completato' : event.active ? 'In corso' : 'In attesa'}
            >
              <EventIcon className="size-3.5" />
              <span>{event.label}</span>
            </div>
            {idx < events.length - 1 && events[idx + 1]?.key !== 'failed' && (
              <ChevronRight className="size-4" />
            )}
          </React.Fragment>
        );
      })}
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-12 text-purple-400 animate-spin" />
          <span className="text-muted-foreground">Caricamento job...</span>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="size-12 text-red-400" />
          <span className="text-muted-foreground">{error}</span>
          <div className="flex gap-3">
            <button onClick={() => refresh()} className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              Riprova
            </button>
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-muted text-foreground/80 rounded-lg hover:bg-muted transition-colors">
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
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border/80 px-6 py-4 bg-card/50">
        <div className="flex items-center gap-4">
          <Film className="size-5 text-primary" />
          <h2 className="text-lg font-bold leading-tight tracking-tight">Job Detail</h2>
        </div>
        <div className="flex items-center gap-6">
          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="size-5" />
            <span className="absolute top-0 right-0 size-2 bg-primary rounded-full"></span>
          </button>
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border bg-muted" />
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-2 text-sm font-medium">
          <button onClick={() => navigate('/analytics')} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Home className="size-[18px]" />
            Dashboard
          </button>
          <ChevronRight className="size-4 " />
          <span className="text-foreground truncate max-w-xs" title={job.id}>
            Job {job.id.slice(0, 12)}...
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{job.projectId || 'Untitled Project'}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${renderBadge.bg} ${renderBadge.color} text-sm font-semibold`}>
              <renderBadge.icon className={`size-4 ${renderBadge.animate ? 'animate-pulse' : ''}`} />
              {renderBadge.label}
            </span>
          </div>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium w-fit"
          >
            <RefreshCw className="size-5 " />
            Aggiorna
          </button>
        </div>

        {/* Render status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card/50 border rounded-xl p-5 shadow-sm">
            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Stato Rendering</div>
            <div className={`text-lg font-bold ${renderBadge.color} flex items-center gap-2`}>
              <renderBadge.icon className="size-5" />
              {renderBadge.label}
            </div>
          </div>
          <div className="bg-card/50 border rounded-xl p-5 shadow-sm">
            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Creato</div>
            <div className="text-sm font-medium text-foreground/80">{formatDate(job.createdAt)}</div>
          </div>
          <div className="bg-card/50 border rounded-xl p-5 shadow-sm">
            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Ultimo aggiornamento</div>
            <div className="text-sm font-medium text-foreground/80">{formatDate(job.updatedAt)}</div>
          </div>
        </div>

        {/* Deliveries */}
        <div className="bg-card/50 border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Share2 className="size-5 text-primary" />
              Stato Pubblicazione
            </h3>
            <span className="text-xs text-muted-foreground font-medium">{deliveries.length} destinazioni</span>
          </div>

          {deliveries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed border rounded-xl">
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
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-[18px] " />
            Torna alla dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default VeloxJobDetailView;
