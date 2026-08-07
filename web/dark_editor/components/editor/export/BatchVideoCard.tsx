'use client';

import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import { videoKey } from '@/hooks/useBatchYouTubeTargets';

interface BatchVideoCardProps {
  video: GroupVideo;
  selected: boolean;
  previewUrl?: string;
  variant?: { previewUrl: string; language?: string; translatedText?: string; title?: string; description?: string };
  localizedMetadata?: { language?: string; title?: string; description?: string };
  result?: { status: 'pending' | 'success' | 'error'; message?: string };
  onToggle: () => void;
  onEdit?: () => void;
}

export function BatchVideoCard({ video, selected, previewUrl, variant, localizedMetadata, result, onToggle, onEdit }: BatchVideoCardProps) {
  const thumbnail = previewUrl || video.thumbnail_url || video.thumbnail;
  const displayTitle = variant?.title || localizedMetadata?.title || video.title;
  const displayDescription = variant?.description || localizedMetadata?.description;
  const displayLanguage = variant?.language || localizedMetadata?.language || video.language || 'en';
  const normalizedLanguage = displayLanguage.toLowerCase().replace('_', '-');
  const languageCode = normalizedLanguage.split('-')[0];
  const languageEmoji: Record<string, string> = {
    en: '🇬🇧',
    es: '🇪🇸',
    it: '🇮🇹',
    de: '🇩🇪',
    fr: '🇫🇷',
    tr: '🇹🇷',
    pt: '🇵🇹',
    id: '🇮🇩',
    ind: '🇮🇩',
    'id-id': '🇮🇩',
    in: '🇮🇩',
    ar: '🇸🇦',
    ja: '🇯🇵',
    ko: '🇰🇷',
    ru: '🇷🇺',
    zh: '🇨🇳',
  };
  return (
    <article className={`publish-card group relative min-w-0 overflow-hidden text-left transition-all duration-150 ${selected ? 'border-violet-500/70 ring-1 ring-violet-500/35' : 'hover:border-white/[0.14] hover:bg-white/[0.03]'}`} data-video-key={videoKey(video)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${selected ? 'Deseleziona' : 'Seleziona'} ${video.title}`}
        aria-pressed={selected}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className="relative aspect-video cursor-pointer overflow-hidden bg-[#24243f] outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
      >
        {thumbnail ? <img src={thumbnail} alt={variant?.translatedText ? `Preview cover ${variant.language || ''}: ${variant.translatedText}` : ''} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[11px] text-white/35">Anteprima non disponibile</div>}
        <span className={`absolute left-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full border text-[11px] ${selected ? 'border-violet-400 bg-violet-600 text-white' : 'border-white/20 bg-black/40 text-transparent'}`}>✓</span>
        {result && <span className={`absolute right-2.5 top-2.5 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-semibold ${result.status === 'success' ? 'text-emerald-300' : result.status === 'error' ? 'text-rose-300' : 'text-white/75'}`}>{result.status === 'success' ? 'Applicata' : result.status === 'error' ? 'Errore' : 'In corso'}</span>}
      </div>
      <div
        role={onEdit ? 'button' : undefined}
        tabIndex={onEdit ? 0 : undefined}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (onEdit && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onEdit();
          }
        }}
        className={`space-y-1 p-3 ${onEdit ? 'cursor-pointer outline-none hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/70' : ''}`}
        title={onEdit ? 'Apri modifica variante canale' : undefined}
      >
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-white/90">{displayTitle}</h3>
        {displayDescription && <p className="line-clamp-1 text-[11px] leading-[1.35] text-white/40">{displayDescription}</p>}
        <p className="truncate text-[11px] text-white/55">{languageEmoji[normalizedLanguage] || languageEmoji[languageCode] || '🌐'} {video.channel_name}</p>
      </div>
    </article>
  );
}
