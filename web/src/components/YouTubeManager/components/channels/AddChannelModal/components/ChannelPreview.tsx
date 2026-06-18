import React from 'react';
import { ChannelSearchResult, ChannelVideo } from '../hooks/useAddChannel';

export interface ChannelPreviewProps {
    channel: ChannelSearchResult;
    isExpanded: boolean;
    videos: ChannelVideo[];
    isLoadingVids: boolean;
    onToggleExpand: () => void;
    onAddChannel: () => void;
}

export const ChannelPreview: React.FC<ChannelPreviewProps> = ({
    channel,
    isExpanded,
    videos,
    isLoadingVids,
    onToggleExpand,
    onAddChannel,
}) => {
    const subs = channel.subscribers
        ? (typeof channel.subscribers === 'number'
            ? (channel.subscribers >= 1000000
                ? (channel.subscribers / 1000000).toFixed(1) + 'M'
                : channel.subscribers >= 1000
                    ? (channel.subscribers / 1000).toFixed(1) + 'K'
                    : String(channel.subscribers))
            : channel.subscribers)
        : null;

    return (
        <div className="bg-slate-800/50 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors cursor-pointer" onClick={onToggleExpand}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center shrink-0">
                    {channel.thumbnail ? (
                        <img src={channel.thumbnail} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <span className="material-symbols-rounded text-gray-500">person</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{channel.title || channel.channel}</p>
                        {isExpanded ? (
                            <span className="material-symbols-rounded text-purple-400 text-[14px]">expand_less</span>
                        ) : (
                            <span className="material-symbols-rounded text-gray-500 text-[14px]">expand_more</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {channel.channel && channel.title && channel.channel !== channel.title && (
                            <span className="text-xs text-gray-500">@{channel.channel}</span>
                        )}
                        {subs && (
                            <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                                <span className="material-symbols-rounded text-[10px]">group</span>
                                {subs} subs
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onAddChannel(); }}
                    className="shrink-0 w-8 h-8 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-full flex items-center justify-center transition-all"
                    title="Aggiungi al gruppo"
                >
                    <span className="material-symbols-rounded text-[18px]">add</span>
                </button>
            </div>

            {isExpanded && (
                <div className="border-t border-slate-700 p-3 bg-slate-900/50">
                    {isLoadingVids ? (
                        <div className="flex items-center justify-center py-4 text-gray-500">
                            <span className="material-symbols-rounded animate-spin mr-2">progress_activity</span>
                            Caricamento video...
                        </div>
                    ) : videos.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                <span className="material-symbols-rounded text-[12px]">visibility</span>
                                Ultimi video
                            </p>
                            {videos.map((video, vIdx) => (
                                <a
                                    key={vIdx}
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="w-20 h-11 rounded overflow-hidden bg-slate-800 shrink-0">
                                        {video.thumbnail && <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-300 line-clamp-2 group-hover:text-purple-400 transition-colors">{video.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {video.views && <span className="text-[10px] text-gray-500">{video.views} views</span>}
                                            {video.published && <span className="text-[10px] text-gray-600">• {video.published}</span>}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-2">Nessun video trovato</p>
                    )}
                </div>
            )}
        </div>
    );
};