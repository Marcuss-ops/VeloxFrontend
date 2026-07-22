import React from 'react';
import type { NewsItem } from '../../../../lib/utils';
import { getFinalScoreColor, getFinalScoreBg } from '../../utils/groupFeed';

interface GroupFeedMacroNewsProps {
    items: NewsItem[];
    groupName: string;
    onInspect: (item: NewsItem) => void;
}

export const GroupFeedMacroNews: React.FC<GroupFeedMacroNewsProps> = ({ items, groupName, onInspect }) => {
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[16px] text-amber-400">trending_up</span>
                    Trending in {groupName}
                    <span className="text-[10px] text-gray-600 font-normal">(macro)</span>
                </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20 hover:border-amber-500/40 transition-colors group">
                        {item.finalScore !== undefined && (
                            <div className={`text-2xl font-black min-w-[40px] text-center px-1 py-0.5 rounded border ${getFinalScoreBg(item.finalScore)} ${getFinalScoreColor(item.finalScore)}`}>
                                {item.finalScore}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-gray-200 line-clamp-2 group-hover:text-amber-400 transition-colors">{item.title}</p>
                            <span className="text-[9px] text-gray-500">{item.source}</span>
                        </div>
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInspect(item); }}
                            className="shrink-0 w-6 h-6 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-full flex items-center justify-center transition-all"
                            title="Ispeziona"
                        >
                            <span className="material-symbols-rounded text-[14px]">add</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
