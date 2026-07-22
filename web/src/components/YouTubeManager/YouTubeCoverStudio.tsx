import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Sparkles, Languages, Palette, Wand2, Image as ImageIcon, AlertTriangle, RefreshCw, CheckSquare, Square, ExternalLink, Calendar } from 'lucide-react';
import { youtubeApi } from '@/lib/api/youtubeApi';
import { showToast } from '@/lib/api/toast';
import { normalizeManagerGroups } from './utils/managerGroups';

type CoverVariant = {
  id: string;
  label: string;
  prompt: string;
  negative_prompt: string;
  headline: string;
  hook: string;
  filename?: string;
  image_base64?: string;
  width: number;
  height: number;
  seed: number;
  provider?: string;
  translation?: string;
};

const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
];

const STYLES = [
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'news', label: 'News' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'tutorial', label: 'Tutorial' },
];

const DEFAULT_TITLE = 'Come creare copertine YouTube che convertono';
const DEFAULT_DESCRIPTION = 'Tre varianti A/B/C con traduzione, testo pulito e prompt ottimizzato per FLUX.';

type ManagerGroupsResponse = {
  ok?: boolean;
  groups?: Record<string, {
    name?: string;
    channels?: Array<{
      id: string;
      title?: string;
      name?: string;
    }>;
  }> | Array<{
    name?: string;
    channels?: Array<{
      id: string;
      title?: string;
      name?: string;
    }>;
  }>;
};

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiato`, 'success');
    } catch {
      showToast('Impossibile copiare il testo', 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      <Copy size={12} />
      {label}
    </button>
  );
};

export const YouTubeCoverStudio: React.FC = () => {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [targetLanguage, setTargetLanguage] = useState('it');
  const [style, setStyle] = useState('cinematic');
  const [extraPrompt, setExtraPrompt] = useState('Testo grande, volto espressivo e forte contrasto visivo.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [publishAfterApply, setPublishAfterApply] = useState(true);
  const [publishPrivacy, setPublishPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [channels, setChannels] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [groups, setGroups] = useState<Array<{ name: string; channels?: Array<{ id: string; title?: string; name?: string }> }>>([]);
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [videos, setVideos] = useState<Array<{ video_id: string; title: string; privacy_status?: string; description?: string; thumbnail?: string; view_count?: number; published_at?: string }>>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<'1' | '7' | '14' | 'all'>('all');

  const filteredVideos = useMemo(() => {
    if (timeFilter === 'all') return videos;
    const now = new Date();
    const days = parseInt(timeFilter);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return videos.filter((video) => {
      if (!video.published_at) return false;
      const pubDate = new Date(video.published_at);
      return pubDate >= cutoff;
    });
  }, [videos, timeFilter]);

  const [activeVariantId, setActiveVariantId] = useState('A');
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    sanitized_title: string;
    translated_title: string;
    translated_body?: string;
    target_language: string;
    style: string;
    provider: string;
    warnings?: string[];
    variants: CoverVariant[];
  } | null>(null);

  const titleLength = useMemo(() => title.trim().length, [title]);
  const activeVariant = useMemo(
    () => result?.variants.find((variant) => variant.id === activeVariantId) ?? result?.variants[0] ?? null,
    [activeVariantId, result]
  );

  useEffect(() => {
    let mounted = true;
    const loadChannels = async () => {
        try {
            const groupData = await youtubeApi.managerGroups().catch(() => null);
            if (!mounted) return;
            const rawGroups = (groupData as ManagerGroupsResponse | null)?.groups;
            const groupList = normalizeManagerGroups(rawGroups).map(group => ({
              name: String(group.name || '').trim(),
              channels: group.channels || [],
            }));
            setGroups(groupList as Array<{ name: string; channels?: Array<{ id: string; title?: string; name?: string }> }>);

        const allChannels = groupList.flatMap((group) => group.channels || []);
        const uniqueChannels = Array.from(new Map(allChannels.map((channel) => [channel.id, {
          id: channel.id,
          name: channel.name || channel.title || channel.id,
          title: channel.title || channel.name || channel.id,
        }])).values());
        setChannels(uniqueChannels);

        const initialGroup = groupList[0]?.name || '';
        setSelectedGroupName((prev) => prev || initialGroup);

        const initialChannel = groupList[0]?.channels?.[0]?.id || uniqueChannels[0]?.id || '';
        setSelectedChannelId((prev) => prev || initialChannel);
      } catch {
        if (mounted) {
          setChannels([]);
          setGroups([]);
        }
      }
    };
    loadChannels();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleChannels = useMemo(() => {
    if (selectedGroupName) {
      const match = groups.find((group) => group.name === selectedGroupName);
      if (match?.channels?.length) {
        return match.channels.map((channel) => ({
          id: channel.id,
          name: channel.name || channel.title || channel.id,
          title: channel.title || channel.name || channel.id,
        }));
      }
    }
    return channels.map((channel) => ({
      id: channel.id,
      name: channel.name || channel.title || channel.id,
      title: channel.title || channel.name || channel.id,
    }));
  }, [channels, groups, selectedGroupName]);

  useEffect(() => {
    if (!visibleChannels.length) return;
    if (!visibleChannels.some((channel) => channel.id === selectedChannelId)) {
      setSelectedChannelId(visibleChannels[0].id);
    }
  }, [selectedChannelId, visibleChannels]);

  useEffect(() => {
    if (!selectedChannelId) return;
    let mounted = true;
    const loadVideos = async () => {
      setIsLoadingVideos(true);
      try {
        const data = await youtubeApi.listVideos(selectedChannelId, 50);
        if (!mounted) return;
        const allVideos = Array.isArray((data as any).videos) ? (data as any).videos : [];
        const privateVideos = allVideos.filter((v: any) => (v.privacy_status || '').toLowerCase() === 'private');
        setVideos(privateVideos);
        setSelectedVideoIds((prev) => prev.filter((id) => privateVideos.some((v: any) => v.video_id === id)));
      } catch {
        if (mounted) {
          setVideos([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingVideos(false);
        }
      }
    };
    loadVideos();
    return () => {
      mounted = false;
    };
  }, [selectedChannelId]);

  const handleGenerate = async () => {
    if (!title.trim()) {
      showToast('Inserisci un titolo da trasformare', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const data = await youtubeApi.generateCoverPack({
        title,
        description,
        target_language: targetLanguage,
        style,
        extra_prompt: extraPrompt,
        width: 1280,
        height: 720,
        steps: 4,
        variant_count: 3,
      });
      setResult(data);

      if (data.warnings?.length) {
        showToast('Copertine generate con avvisi', 'warning', data.warnings.join(' • '), 6000);
      } else {
        showToast('Pack copertine generato', 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      showToast('Generazione fallita', 'error', message, 7000);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) => (
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    ));
  };

  const selectAllVideos = () => {
    setSelectedVideoIds(videos.map((video) => video.video_id));
  };

  const clearSelection = () => {
    setSelectedVideoIds([]);
  };

  const handleApplyCover = async (targetVideoIds: string[], _variant: CoverVariant | null = activeVariant) => {
    if (targetVideoIds.length === 0) {
      showToast('Seleziona almeno un video privato', 'warning');
      return;
    }

    setIsApplying(true);
    try {
      showToast(
        'L\'applicazione diretta delle copertine su YouTube è stata rimossa; usare il flusso InstaEdit destination per pubblicare il video con la copertina.',
        'warning',
        undefined,
        7000
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.94),_rgba(2,6,23,0.98))] p-6 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(135deg,transparent_0%,transparent_42%,rgba(255,255,255,0.04)_50%,transparent_58%,transparent_100%)]" />
        <div className="relative flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-red-300">
            <Sparkles size={12} />
            YouTube Cover Studio
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Crea 3 copertine A/B/C con traduzione, pulizia testo e prompt FLUX.
          </h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Il backend prepara il testo pulito e tradotto, poi genera tre varianti visive con NVIDIA FLUX. Ogni card include prompt, hook e immagine pronta da valutare.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/70 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            <Wand2 size={16} className="text-red-400" />
            Brief
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Titolo</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-red-500/50 focus:bg-white/[0.07]"
                placeholder="Titolo del video"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>{titleLength} caratteri</span>
                <span>Auto clean + A/B/C</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Descrizione / contesto</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-red-500/50 focus:bg-white/[0.07]"
                placeholder="Contesto, call-to-action, keyword"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <Languages size={12} />
                  Lingua
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/50 focus:bg-white/[0.07]"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <Palette size={12} />
                  Stile
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((item) => {
                    const active = style === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStyle(item.id)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${
                          active
                            ? 'border-red-500/40 bg-red-500/15 text-red-200'
                            : 'border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Prompt extra</label>
              <textarea
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-red-500/50 focus:bg-white/[0.07]"
                placeholder="Indicazioni extra per la copertina"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-red-500/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {isGenerating ? 'Generazione in corso' : 'Genera Pack 3x'}
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/70 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Preview testo</div>
              <div className="mt-1 text-xs text-slate-500">Pulizia + traduzione + provider</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
              {result?.provider || 'pending'}
            </div>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Titolo pulito</div>
                <div className="mt-2 text-sm font-bold text-white">{result.sanitized_title}</div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">Tradotto: {result.translated_title}</span>
                  <CopyButton text={result.translated_title} label="Titolo" />
                </div>
              </div>

              {result.translated_body && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Descrizione tradotta</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{result.translated_body}</p>
                </div>
              )}

              {result.warnings?.length ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]">
                    <AlertTriangle size={12} />
                    Warning
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
                    {result.warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.03] p-6 text-center text-sm text-slate-500">
              Genera il pack per vedere titolo, traduzione e varianti pronte.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/70 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Target videos</div>
              <div className="mt-1 text-xs text-slate-500">Seleziona i privati del canale scelto e applica la stessa cover</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
              {videos.length} privati
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Gruppo</label>
              <select
                value={selectedGroupName}
                onChange={(e) => {
                  const nextGroup = e.target.value;
                  setSelectedGroupName(nextGroup);
                  const nextChannels = nextGroup
                    ? (groups.find((group) => group.name === nextGroup)?.channels || [])
                    : channels;
                  setSelectedChannelId(nextChannels[0]?.id || '');
                }}
                className="mb-3 w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/50 focus:bg-white/[0.07]"
              >
                <option value="" className="bg-slate-900">Tutti i canali</option>
                {groups.map((group) => (
                  <option key={group.name} value={group.name} className="bg-slate-900">
                    {group.name}
                  </option>
                ))}
              </select>

              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Canale</label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/50 focus:bg-white/[0.07]"
              >
                {visibleChannels.map((channel) => (
                  <option key={channel.id} value={channel.id} className="bg-slate-900">
                    {channel.title || channel.name || channel.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllVideos}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <CheckSquare size={12} />
                Tutti
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <Square size={12} />
                Nessuno
              </button>
              <button
                type="button"
                onClick={() => handleApplyCover(selectedVideoIds)}
                disabled={isApplying || selectedVideoIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplying ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Applica selezionati
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={publishAfterApply}
                  onChange={(e) => setPublishAfterApply(e.target.checked)}
                  className="accent-red-500"
                />
                Cambia visibilità dopo la cover
              </label>
              <select
                value={publishPrivacy}
                onChange={(e) => setPublishPrivacy(e.target.value as 'public' | 'unlisted' | 'private')}
                disabled={!publishAfterApply}
                className="ml-auto rounded-xl border border-white/8 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 outline-none disabled:opacity-50"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {isLoadingVideos ? 'Caricamento...' : `${filteredVideos.length} video privati`}
                </span>
                
                {/* Time Range Selector */}
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                  <span className="px-1.5 text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                    <Calendar size={10} /> Filtro:
                  </span>
                  {(['1', '7', '14', 'all'] as const).map((opt) => {
                    const labels: Record<string, string> = {
                      '1': '1G',
                      '7': '7G',
                      '14': '14G',
                      'all': 'Tutto'
                    };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTimeFilter(opt)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                          timeFilter === opt
                            ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="max-h-[420px] divide-y divide-white/5 overflow-auto">
                {filteredVideos.length === 0 && !isLoadingVideos ? (
                  <div className="px-4 py-6 text-sm text-slate-500">Nessun video privato trovato con questo filtro temporale.</div>
                ) : (
                  filteredVideos.map((video) => {
                    const checked = selectedVideoIds.includes(video.video_id);
                    return (
                      <div key={video.video_id} className="flex items-center gap-3 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleVideoSelection(video.video_id)}
                          className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
                            checked ? 'border-red-500/40 bg-red-500/20 text-red-300' : 'border-white/10 bg-white/[0.03] text-slate-600 hover:text-slate-300'
                          }`}
                        >
                          {checked ? <CheckSquare size={14} /> : <Square size={14} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-white">{video.title}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {video.video_id} · {video.privacy_status || 'private'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeVariant) {
                              handleApplyCover([video.video_id], activeVariant);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-500/15 hover:text-white"
                          title="Applica la cover attiva a questo video"
                        >
                          <ExternalLink size={12} />
                          Export
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/70 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Preview testo</div>
              <div className="mt-1 text-xs text-slate-500">Pulizia + traduzione + provider</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
              {result?.provider || 'pending'}
            </div>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Titolo pulito</div>
                <div className="mt-2 text-sm font-bold text-white">{result.sanitized_title}</div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">Tradotto: {result.translated_title}</span>
                  <CopyButton text={result.translated_title} label="Titolo" />
                </div>
              </div>

              {result.translated_body && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Descrizione tradotta</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{result.translated_body}</p>
                </div>
              )}

              {result.warnings?.length ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]">
                    <AlertTriangle size={12} />
                    Warning
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
                    {result.warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.03] p-6 text-center text-sm text-slate-500">
              Genera il pack per vedere titolo, traduzione e varianti pronte.
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Varianti</div>
              <div className="mt-1 text-xs text-slate-500">Tre concept pronti per il test A/B/C su YouTube</div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {result.variants.map((variant, index) => {
              const imageSrc = variant.image_base64 ? `data:image/png;base64,${variant.image_base64}` : '';
              return (
                <motion.article
                  key={variant.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="overflow-hidden rounded-[1.75rem] border border-white/5 bg-slate-950/70 shadow-xl shadow-black/20 backdrop-blur-xl"
                >
                  <div className="relative aspect-video bg-slate-900">
                    {imageSrc ? (
                      <img src={imageSrc} alt={variant.label} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.15),_transparent_55%)] text-slate-600">
                        <ImageIcon size={36} />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                      Variante {variant.label}
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Headline</div>
                      <div className="mt-1 text-sm font-bold text-white">{variant.headline}</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Hook</div>
                      <div className="mt-1 text-sm text-slate-300">{variant.hook}</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Prompt</div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{variant.prompt}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <CopyButton text={variant.prompt} label="Prompt" />
                      <CopyButton text={variant.headline} label="Headline" />
                      <button
                        type="button"
                        onClick={() => setActiveVariantId(variant.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                          activeVariantId === variant.id
                            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Sparkles size={12} />
                        Seleziona
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyCover(selectedVideoIds.length ? selectedVideoIds : [], variant)}
                        disabled={isApplying || selectedVideoIds.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ExternalLink size={12} />
                        Applica selezionati
                      </button>
                      {variant.image_base64 && (
                        <a
                          href={imageSrc}
                          download={variant.filename || `cover-${variant.label}.png`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-500/15 hover:text-white"
                        >
                          <Sparkles size={12} />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeCoverStudio;
