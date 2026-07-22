import React from 'react';
import { getSavedNews, NEWS_STATUS_META, type NewsItem } from '../../../../lib/utils';
import { getFinalScoreColor, getFinalScoreBg } from '../../utils/groupFeed';

interface GroupFeedNewsListProps {
    items: NewsItem[];
    tags: string[];
    onRefresh: () => void;
    onOpenSaved: () => void;
    onInspect: (item: NewsItem) => void;
}

export const GroupFeedNewsList: React.FC<GroupFeedNewsListProps> = ({ items, tags, onRefresh, onOpenSaved, onInspect }) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[16px] text-blue-400">newspaper</span>
                    I Tuoi Interessi
                    <span className="text-[10px] text-gray-600 font-normal">({tags.slice(0, 3).join(', ')})</span>
                </h4>
                <div className="flex items-center gap-2">
                    <button onClick={onRefresh} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-medium transition-all" title="Aggiorna news">
                        <span className="material-symbols-rounded text-[14px]">refresh</span>
                        Refresh
                    </button>
                    {getSavedNews().size > 0 && (
                        <button onClick={onOpenSaved} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">
                            <span className="material-symbols-rounded text-[14px]">bookmark</span>
                            Saved ({getSavedNews().size})
                        </button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map((item, idx) => {
                    const saved = getSavedNews().get(item.url);
                    return (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-[#222] rounded-lg border border-border-dark hover:border-blue-500/50 transition-colors group">
                            {item.finalScore !== undefined && (
                                <div className={`text-3xl font-black min-w-[48px] text-center px-2 py-1 rounded-lg border ${getFinalScoreBg(item.finalScore)} ${getFinalScoreColor(item.finalScore)}`}>
                                    {item.finalScore}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">{item.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-500">{item.source}</span>
                                    {item.keywordScore ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300">+{item.keywordScore}</span> : null}
                                    {saved && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${NEWS_STATUS_META[saved.status].bgClass} ${NEWS_STATUS_META[saved.status].colorClass}`}>
                                            {NEWS_STATUS_META[saved.status].label}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInspect(item); }}
                                className="shrink-0 w-8 h-8 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full flex items-center justify-center transition-all"
                                title="Ispeziona"
                            >
                                <span className="material-symbols-rounded text-[18px]">add</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
