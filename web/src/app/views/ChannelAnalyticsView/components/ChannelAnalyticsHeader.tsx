/**
 * ChannelAnalyticsHeader — operator-facing banner with avatar, name,
 * status, last sync, optional stale marker, and back/refresh buttons.
 *
 * No fetch / no calculations: receives the channel + freshness data
 * via props and a single onRefresh callback.
 */

import type {
  AnalyticsChannelInfo,
  AnalyticsDataFreshness,
} from '../types';
import { formatLastSynced } from '../utils/formatKpi';

export interface ChannelAnalyticsHeaderProps {
  channel: AnalyticsChannelInfo;
  dataFreshness: AnalyticsDataFreshness;
  onRefresh: () => void;
  onBack?: () => void;
}

export function ChannelAnalyticsHeader({
  channel,
  dataFreshness,
  onRefresh,
  onBack,
}: ChannelAnalyticsHeaderProps) {
  return (
    <header role="banner" className="flex items-start gap-4 border-b pb-4">
      {channel.avatar_url ? (
        <img
          src={channel.avatar_url}
          alt=""
          className="size-12 rounded-full shrink-0"
        />
      ) : (
        <div
          aria-hidden="true"
          className="size-12 rounded-full bg-muted shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold truncate">{channel.channel_name}</h1>
        <div className="text-sm text-muted-foreground flex gap-3 flex-wrap items-center mt-1">
          <span>Stato: <strong className="text-foreground">{channel.status}</strong></span>
          <span aria-hidden="true">·</span>
          <span>
            Ultimo aggiornamento:{' '}
            <time dateTime={dataFreshness.last_synced_at}>
              {formatLastSynced(dataFreshness.last_synced_at)}
            </time>
          </span>
          {dataFreshness.is_stale && (
            <span
              role="status"
              data-stale="true"
              className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs font-medium"
            >
              Dati non aggiornati
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            Torna ai canali
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Aggiorna dati del canale"
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
        >
          Aggiorna
        </button>
      </div>
    </header>
  );
}

export default ChannelAnalyticsHeader;
