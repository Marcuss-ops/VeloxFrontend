/**
 * TrendingVideosTable — two tabs (Most viewed / Growing) driven by
 * the dual-list ranking the backend returns. Clicking a row opens
 * the public YouTube URL in a new tab; the row is a real <a> so
 * keyboard navigation, screen readers, and middle-click work the
 * same as elsewhere on the web.
 *
 * Pure presentational: receives both rankings via props and never
 * recomputes the sort — the scorer (Step 5) is server-side.
 *
 * A11y: tablist uses arrow-key navigation per WAI-ARIA Authoring
 * Practices (Left/Right move focus and selection; Home/End jump
 * to first/last tab). Each tab has aria-selected + aria-controls
 * pointing at the shared tabpanel.
 */

import { useRef, useState, type KeyboardEvent } from 'react';
import type { AnalyticsTopVideos, AnalyticsTopVideo } from '../types';
import { formatCompact, formatInt, formatPercent } from '../utils/formatKpi';

type Tab = 'most_viewed' | 'growing';

interface TabDef {
  key: Tab;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'most_viewed', label: 'Più visti' },
  { key: 'growing', label: 'In crescita' },
];

interface VideoRowProps {
  video: AnalyticsTopVideo;
}

function VideoRow({ video }: VideoRowProps) {
  const trend = Number.isFinite(video.trend_score) ? video.trend_score.toFixed(2) : '—';
  return (
    <a
      href={video.youtube_url}
      target="_blank"
      rel="noopener noreferrer"
      className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr] gap-3 items-center p-2 rounded hover:bg-muted"
      data-video-id={video.video_id}
      data-trend-score={trend}
    >
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt=""
          className="size-12 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <div aria-hidden="true" className="size-12 rounded bg-muted" />
      )}
      <div className="min-w-0">
        <p className="font-medium truncate" title={video.title}>{video.title}</p>
        <p className="text-xs text-muted-foreground">
          Pubblicato il{' '}
          <time dateTime={video.published_at}>
            {new Date(video.published_at).toLocaleDateString('it-IT')}
          </time>
        </p>
      </div>
      <span className="tabular-nums text-sm">{formatInt(video.views_in_period)}</span>
      <span className="tabular-nums text-sm">
        {formatCompact(video.views_per_day)}/g
      </span>
      <span className="tabular-nums text-sm">
        {video.growth_percentage !== undefined
          ? formatPercent(video.growth_percentage)
          : '—'}
      </span>
      <span className="tabular-nums text-sm">{trend}</span>
    </a>
  );
}

export interface TrendingVideosTableProps {
  topVideos: AnalyticsTopVideos;
  ariaLabel?: string;
}

export function TrendingVideosTable({
  topVideos,
  ariaLabel = 'Video di tendenza',
}: TrendingVideosTableProps) {
  const [active, setActive] = useState<Tab>('most_viewed');
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    most_viewed: null,
    growing: null,
  });
  const list = active === 'most_viewed' ? topVideos.most_viewed : topVideos.growing;

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const currentIdx = TABS.findIndex((t) => t.key === active);
    if (currentIdx < 0) return;
    let nextIdx = currentIdx;
    switch (e.key) {
      case 'ArrowRight':
        nextIdx = (currentIdx + 1) % TABS.length;
        break;
      case 'ArrowLeft':
        nextIdx = (currentIdx - 1 + TABS.length) % TABS.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = TABS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = TABS[nextIdx].key;
    setActive(next);
    // Move DOM focus so screen readers track the active tab.
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-label={ariaLabel} className="border rounded-lg p-4 bg-card space-y-3">
      <div
        role="tablist"
        aria-label="Classifica video"
        className="inline-flex border rounded-md overflow-hidden"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`trending-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls="trending-tabpanel"
              data-tab={tab.key}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              onClick={() => setActive(tab.key)}
              onKeyDown={onTabKeyDown}
              className={`px-4 py-1.5 text-sm border-r last:border-r-0 ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="trending-tabpanel"
        aria-labelledby={`trending-tab-${active}`}
        className="space-y-1"
      >
        <div
          className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr] gap-3 px-2 text-xs text-muted-foreground"
        >
          <span aria-hidden="true" />
          <span>Video</span>
          <span>Views / periodo</span>
          <span>Views / giorno</span>
          <span>Crescita</span>
          <span>Trend score</span>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            Nessun video in questa classifica.
          </p>
        ) : (
          list.map((v) => <VideoRow key={v.video_id} video={v} />)
        )}
      </div>
    </section>
  );
}

export default TrendingVideosTable;
