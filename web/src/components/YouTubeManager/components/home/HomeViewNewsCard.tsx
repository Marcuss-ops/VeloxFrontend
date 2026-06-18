import React from 'react';
import { getFinalScoreColor, getFinalScoreBg, type SavedNewsItem } from '../../utils/homeView';

interface NewsResult {
    title: string;
    url: string;
    source: string;
    viralityScore?: number;
    tags?: string[];
    keywordScore?: number;
    finalScore?: number;
}

interface HomeViewNewsCardProps {
    news: NewsResult;
    saved?: SavedNewsItem;
    onOpen: (news: NewsResult) => void;
}

export const HomeViewNewsCard: React.FC<HomeViewNewsCardProps> = ({ news, saved, onOpen }) => {
    return (
        <div className="flex items-center gap-2 p-3 bg-[#111] border border-border-dark hover:border-orange-500/50 rounded-lg transition-all group">
            {news.finalScore !== undefined && (
                <div className={`text-3xl font-black min-w-[48px] text-center px-2 py-1 rounded-lg border ${getFinalScoreBg(news.finalScore)} ${getFinalScoreColor(news.finalScore)}`}>
                    {news.finalScore}
                </div>
            )}
            <a href={news.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 block">
                <p className="text-xs text-gray-200 line-clamp-2 group-hover:text-orange-400 transition-colors">{news.title}</p>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-gray-500">{news.source}</p>
                    {news.keywordScore !== undefined && news.keywordScore > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40">
                            +{news.keywordScore}
                        </span>
                    )}
                    {saved && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300">
                            {saved.status}
                        </span>
                    )}
                </div>
            </a>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(news); }}
                className="shrink-0 w-8 h-8 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full flex items-center justify-center transition-all"
                title="Ispeziona"
            >
                <span className="material-symbols-rounded text-[18px]">add</span>
            </button>
        </div>
    );
};
