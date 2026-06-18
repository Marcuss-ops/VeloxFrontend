'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCcw, Users, Video, Lock, Calendar, Globe, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { YouTubeVideoCard } from './YouTubeVideoCard';
import { EmptyState } from './EmptyState';
import { useGroupVideos } from '@/lib/hooks/useGroupVideos';
import { listVideos } from '@/lib/youtube/videos';
import type { YouTubeGroup, YouTubeVideo } from '@/lib/youtube/types';
import { YouTubeCoverTools } from './YouTubeCoverTools';

interface YouTubeGroupPanelProps {
  group: YouTubeGroup;
}

export function YouTubeGroupPanel({ group }: YouTubeGroupPanelProps) {
  const { videos, privateVideos, loading, error, reload } = useGroupVideos(group.name);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [channelLoading, setChannelLoading] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<'1' | '7' | '14' | '90'>('90');
  const [visibilityFilter, setVisibilityFilter] = useState<'private' | 'public' | 'unlisted' | 'all'>('private');

  useEffect(() => {
    setSelectedVideoIds([]);
    if (!selectedChannelId) {
      setChannelVideos([]);
      return;
    }
    setChannelLoading(true);
    listVideos(selectedChannelId)
      .then((res) => {
        const videosWithChannel = res.map(v => ({ ...v, channel_id: selectedChannelId }));
        setChannelVideos(videosWithChannel);
      })
      .catch((err) => {
        console.error('Failed to load channel videos:', err);
      })
      .finally(() => {
        setChannelLoading(false);
      });
  }, [selectedChannelId]);

  useEffect(() => {
    setSelectedChannelId(null);
    setSelectedVideoIds([]);
  }, [group]);

  const baseVideos = useMemo(() => {
    if (selectedChannelId) {
      return channelVideos;
    } else {
      const all = [...privateVideos, ...videos];
      const seen = new Set<string>();
      return all.filter((v) => {
        const id = v.video_id || v.title;
        if (!id) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
  }, [selectedChannelId, channelVideos, privateVideos, videos]);

  const filteredVideos = useMemo(() => {
    let result = baseVideos;

    // Apply visibility filter
    if (visibilityFilter !== 'all') {
      result = result.filter((v) => {
        const status = (v.privacy_status || '').toLowerCase();
        if (visibilityFilter === 'private') {
          return status === 'private';
        }
        if (visibilityFilter === 'public') {
          return status === 'public' || status === '';
        }
        if (visibilityFilter === 'unlisted') {
          return status === 'unlisted';
        }
        return true;
      });
    }

    // Apply time filter
    if (timeFilter !== '90') {
      const now = new Date();
      const days = parseInt(timeFilter);
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter((video) => {
        const dateStr = video.published_at || (video as any).upload_date;
        if (!dateStr) return false;
        const pubDate = new Date(dateStr);
        return pubDate >= cutoff;
      });
    }

    return result;
  }, [baseVideos, visibilityFilter, timeFilter]);

  const isVideosLoading = loading || channelLoading;

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  };

  const getSelectedVideosList = (): YouTubeVideo[] => {
    return baseVideos.filter((v) => selectedVideoIds.includes(v.video_id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <h2 className="truncate text-2xl font-black">{group.name}</h2>
            </div>
            {group.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{group.description}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Gruppo YouTube senza descrizione.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedChannelId) {
                  setChannelLoading(true);
                  listVideos(selectedChannelId)
                    .then((res) => {
                      const videosWithChannel = res.map(v => ({ ...v, channel_id: selectedChannelId }));
                      setChannelVideos(videosWithChannel);
                    })
                    .catch(() => {})
                    .finally(() => setChannelLoading(false));
                } else {
                  void reload();
                }
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Ricarica
            </Button>
          </div>
        </div>
      </div>

      {group.channels && group.channels.length > 0 && (
        <div className="rounded-3xl border border-border bg-card/60 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Canali nel gruppo ({group.channels.length})
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setSelectedChannelId(null);
              }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-all duration-300 ${
                selectedChannelId === null
                  ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-muted/30 border-border/80 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              Tutti i canali
            </button>
            {group.channels.map((ch) => {
              const isSelected = selectedChannelId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSelectedChannelId(ch.id ?? null);
                  }}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-all duration-300 ${
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'bg-muted/30 border-border/80 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  {ch.thumbnail && (
                    <img src={ch.thumbnail} alt="" className="h-4 w-4 rounded-full object-cover" />
                  )}
                  {ch.title || ch.name || ch.id}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <YouTubeCoverTools
        group={group}
        onReload={async () => {
          if (selectedChannelId) {
            const res = await listVideos(selectedChannelId);
            setChannelVideos(res.map(v => ({ ...v, channel_id: selectedChannelId })));
          } else {
            await reload();
          }
        }}
        selectedVideos={getSelectedVideosList()}
        onClearSelection={() => setSelectedVideoIds([])}
      />

      {error ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Video ({filteredVideos.length})
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Visibility Filter Selector */}
                <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border">
                  <span className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Visibilità:
                  </span>
                  {(['all', 'private', 'public', 'unlisted'] as const).map((opt) => {
                    const labels: Record<string, string> = {
                      all: 'Tutti',
                      private: 'Privati',
                      public: 'Pubblici',
                      unlisted: 'Non in elenco'
                    };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setVisibilityFilter(opt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                          visibilityFilter === opt
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                        }`}
                      >
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border">
                  <span className="px-2 text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Calendar size={12} className="text-primary animate-pulse" /> Filtro:
                  </span>
                  {(['1', '7', '14', '90'] as const).map((opt) => {
                    const labels: Record<string, string> = {
                      '1': '1 Giorno',
                      '7': '7 Giorni',
                      '14': '14 Giorni',
                      '90': '3 Mesi'
                    };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTimeFilter(opt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                          timeFilter === opt
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                        }`}
                      >
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {isVideosLoading && filteredVideos.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground animate-pulse">
                Caricamento video...
              </div>
            ) : (
              <>
                {filteredVideos.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
                    Nessun video trovato con i filtri selezionati.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredVideos.map((video) => (
                      <YouTubeVideoCard
                        key={`${video.video_id ?? video.title ?? Math.random()}`}
                        video={video}
                        isSelected={selectedVideoIds.includes(video.video_id)}
                        onClick={() => toggleVideoSelection(video.video_id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
