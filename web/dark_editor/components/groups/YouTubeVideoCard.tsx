import Image from 'next/image';
import { Video, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatDate';
import { PrivacyBadge } from './PrivacyBadge';
import type { YouTubeVideo } from '@/lib/youtube/types';

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  isSelected?: boolean;
  onClick?: () => void;
}

export function YouTubeVideoCard({ video, isSelected, onClick }: YouTubeVideoCardProps) {
  return (
    <article
      onClick={onClick}
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-lg shadow-primary/5 -translate-y-1'
          : 'border-slate-800/60 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40 hover:-translate-y-0.5'
      }`}
    >
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title ?? 'Video'}
            width={1280}
            height={720}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <Video className="h-8 w-8" />
          </div>
        )}
        
        {/* Selection Indicator Checkbox Overlay */}
        <div
          className={`absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
            isSelected
              ? 'bg-primary border-primary scale-110 text-white shadow-md shadow-primary/25'
              : 'bg-black/50 border-white/20 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isSelected && <Check className="h-3 w-3 stroke-[3.5]" />}
        </div>
      </div>
      
      <div className="space-y-2.5 p-4.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`line-clamp-2 text-sm font-semibold tracking-wide leading-snug transition-colors ${isSelected ? 'text-primary' : 'text-slate-200'}`}>
            {video.title}
          </h3>
          <PrivacyBadge value={video.privacy_status} />
        </div>
        <p className="line-clamp-2 text-xs text-slate-400 leading-relaxed">
          {video.description || 'Nessuna descrizione'}
        </p>
        <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-slate-500 pt-1.5 border-t border-slate-900/60">
          <span>{formatDate(video.published_at || (video as any).upload_date)}</span>
          {typeof video.view_count === 'number' ? (
            <span>{video.view_count.toLocaleString()} visualizzazioni</span>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      </div>
    </article>
  );
}
