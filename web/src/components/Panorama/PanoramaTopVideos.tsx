import React from 'react';
import type { TopVideo } from './types';

interface PanoramaTopVideosProps {
    videos: TopVideo[];
}

const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
};

const VideoRow: React.FC<{ video: TopVideo; rank: number }> = ({ video, rank }) => {
    // Generate YouTube thumbnail URL if not provided
    const thumbnailUrl = video.thumbnail_url || 
        (video.video_id ? `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg` : undefined);

    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
            {/* Rank */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                rank <= 3 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                    : 'bg-white/5 text-text-muted'
            }`}>
                {rank}
            </div>

            {/* Thumbnail */}
            <div className="size-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                {thumbnailUrl ? (
                    <img 
                        src={thumbnailUrl} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-rounded text-text-muted text-2xl">video_library</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate text-sm">{video.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                    {video.channel_name && <span className="text-violet-400">{video.channel_name}</span>}
                    {video.channel_name && video.published_at && <span className="mx-1">•</span>}
                    {video.published_at && <span>{new Date(video.published_at).toLocaleDateString()}</span>}
                </p>
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
                <p className="font-semibold text-text-primary">{formatNumber(video.views)}</p>
                <p className="text-xs text-text-muted">views</p>
            </div>

            {/* Revenue if available */}
            {video.revenue !== undefined && video.revenue > 0 && (
                <div className="text-right shrink-0 w-16">
                    <p className="font-semibold text-emerald-400">€{formatNumber(video.revenue)}</p>
                </div>
            )}

            {/* Velocity badge */}
            {video.velocity !== undefined && video.velocity > 0 && (
                <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <span className="material-symbols-rounded text-xs">trending_up</span>
                        {formatNumber(video.velocity)}/d
                    </span>
                </div>
            )}
        </div>
    );
};

export const PanoramaTopVideos: React.FC<PanoramaTopVideosProps> = ({ videos }) => {
    return (
        <div className="rounded-2xl border border-white/5 bg-surface/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-amber-400 text-xl">leaderboard</span>
                    <h2 className="font-semibold text-text-primary">Top 20 Video</h2>
                </div>
                <span className="text-xs text-text-muted">Ultimi 7 giorni</span>
            </div>

            {/* Video list */}
            <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {videos.length === 0 ? (
                    <div className="py-12 text-center text-text-muted">
                        <span className="material-symbols-rounded text-4xl mb-2 opacity-50">videocam_off</span>
                        <p className="text-sm">Nessun video trovato</p>
                        <p className="text-xs mt-2 max-w-sm mx-auto text-text-muted/80">
                            Qui compaiono i video già pubblicati con views (Analytics, ultimi 7 giorni). I video appena completati sono in &quot;Video Completati&quot; e &quot;Da Postare&quot; sotto.
                        </p>
                    </div>
                ) : (
                    videos.slice(0, 20).map((video, idx) => (
                        <VideoRow key={video.video_id || idx} video={video} rank={idx + 1} />
                    ))
                )}
            </div>
        </div>
    );
};