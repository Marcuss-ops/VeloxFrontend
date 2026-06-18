import React from 'react';
import type { FeedItem } from '../../../../lib/utils';
import { copyToClipboard, addToStudio } from '../../../../lib/utils';
import { getRelevanceColor, formatViewCount } from '../../utils/groupFeed';

interface VideoCardData extends FeedItem {
    relevanceScore?: number;
    matchedTags?: string[];
}

interface GroupFeedVideoCardProps {
    video: VideoCardData;
    isExplosive?: boolean;
    onOpen: (video: VideoCardData) => void;
}

export const GroupFeedVideoCard: React.FC<GroupFeedVideoCardProps> = ({ video, isExplosive = false, onOpen }) => {
    const views = formatViewCount(video.view_count);
    const showRelevance = video.relevanceScore !== undefined && video.relevanceScore > 0;

    return (
        <div
            onClick={() => onOpen(video)}
            className={`min-w-[250px] max-w-[280px] bg-[#111] border ${isExplosive ? 'border-orange-500/50' : 'border-border-dark hover:border-red-500/50'} p-3 rounded-lg flex flex-col gap-2 shrink-0 group cursor-pointer transition-all relative`}
        >
            <div className="relative w-full aspect-video rounded overflow-hidden bg-black">
                {video.thumbnail ? (
                    <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                ) : (
                    <span className="material-symbols-rounded text-gray-600">movie</span>
                )}
                {views && (
                    <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
                        <span className="material-symbols-rounded text-[10px]">visibility</span> {views}
                    </div>
                )}
                {isExplosive && (
                    <div className="absolute top-1 right-12 bg-gradient-to-r from-orange-600 to-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-0.5">
                        <span className="material-symbols-rounded text-[12px]">local_fire_department</span>
                    </div>
                )}
                {showRelevance && (
                    <div
                        className={`absolute bottom-1 right-1 ${getRelevanceColor(video.relevanceScore!)} px-1.5 py-0.5 rounded text-[9px] font-bold text-white`}
                        title={`Relevance: ${video.relevanceScore}${video.matchedTags?.length ? ` - Tags: ${video.matchedTags.join(', ')}` : ''}`}
                    >
                        {video.relevanceScore}%
                    </div>
                )}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); addToStudio(video, ''); }} className="bg-black/80 hover:bg-emerald-600 p-1 rounded transition-all" title="Aggiungi a Creator Studio">
                        <span className="material-symbols-rounded text-[14px] text-white">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(video.url || ''); }} className="bg-black/80 hover:bg-purple-600 p-1 rounded transition-all" title="Copia link">
                        <span className="material-symbols-rounded text-[14px] text-white">link</span>
                    </button>
                </div>
            </div>
            <h5 className="text-sm font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors">{video.title}</h5>
            <div className="flex justify-between text-xs text-gray-400">
                <span className="truncate">{video.channel_title || video.uploader}</span>
                <span>{video.days_old === 0 ? 'Oggi' : video.days_old === 1 ? '1 gg' : video.days_old ? `${video.days_old} gg` : ''}</span>
            </div>
        </div>
    );
};
