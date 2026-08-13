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
    <article className={`group relative min-w-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white text-left shadow-sm transition-all duration-150 ${selected ? 'border-black/30 ring-1 ring-black/20' : 'hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md'}`} data-video-key={videoKey(video)}>
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
        className="relative aspect-video cursor-pointer overflow-hidden bg-[#efefec] outline-none focus-visible:ring-2 focus-visible:ring-black/30"
      >
        {/* Runtime blob preview (URL.createObjectURL) — next/image cannot optimize blob: URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumbnail ? <img src={thumbnail} alt={variant?.translatedText ? `Preview cover ${variant.language || ''}: ${variant.translatedText}` : ''} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[11px] text-[#6e6e73]">Anteprima non disponibile</div>}
        <span className={`absolute left-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full border text-[11px] ${selected ? 'border-[#111111] bg-[#111111] text-white' : 'border-white/80 bg-white/90 text-transparent shadow-sm'}`}>✓</span>
        {result && <span className={`absolute right-2.5 top-2.5 rounded-md bg-white/95 px-1.5 py-1 text-[10px] font-semibold shadow-sm ${result.status === 'success' ? 'text-[#2f6b3d]' : result.status === 'error' ? 'text-[#a33a31]' : 'text-[#6e6e73]'}`}>{result.status === 'success' ? 'Applicata' : result.status === 'error' ? 'Errore' : 'In corso'}</span>}
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
        className={`space-y-1 border-t border-black/[0.06] p-3 ${onEdit ? 'cursor-pointer outline-none hover:bg-[#f7f7f5] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30' : ''}`}
        title={onEdit ? 'Apri modifica variante canale' : undefined}
      >
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-[#111111]">{displayTitle}</h3>
        {displayDescription && <p className="line-clamp-1 text-[11px] leading-[1.35] text-[#6e6e73]">{displayDescription}</p>}
        <p className="truncate text-[11px] text-[#6e6e73]">{languageEmoji[normalizedLanguage] || languageEmoji[languageCode] || '🌐'} {video.channel_name}</p>
      </div>
    </article>
  );
}
