import React from 'react';
import { getTimeAgo } from '../../utils/groupFeed';

interface TrendingNewsItem {
    title: string;
    url: string;
    source: string;
    published_at: string;
    description: string;
    image_url?: string;
}

interface GroupFeedTrendingNewsProps {
    items: TrendingNewsItem[];
    loading?: boolean;
}

export const GroupFeedTrendingNews: React.FC<GroupFeedTrendingNewsProps> = ({ items, loading }) => {
    return (
        <div className="pt-4 border-t border-[#222]">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[16px] text-cyan-400">public</span>
                    News Trend del Momento
                    <span className="text-[10px] text-gray-600 font-normal">(fonti esterne)</span>
                </h4>
                {loading && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="material-symbols-rounded animate-spin text-[14px]">progress_activity</span>
                        Caricamento...
                    </span>
                )}
            </div>

            {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((item, idx) => {
                        const pubDate = item.published_at ? new Date(item.published_at) : null;
                        const timeAgo = pubDate ? getTimeAgo(pubDate) : '';

                        return (
                            <a
                                key={idx}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-border-dark hover:border-cyan-500/50 transition-all group"
                            >
                                {item.image_url && (
                                    <div className="w-20 h-20 rounded overflow-hidden bg-slate-800 shrink-0">
                                        <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-200 line-clamp-2 group-hover:text-cyan-400 transition-colors mb-1">
                                        {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                        <span className="truncate">{item.source}</span>
                                        {timeAgo && <span>• {timeAgo}</span>}
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            ) : !loading ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                    <span className="material-symbols-rounded text-3xl mb-2">newspaper</span>
                    <p>Nessuna news trovata per questa nicchia.</p>
                </div>
            ) : null}
        </div>
    );
};
