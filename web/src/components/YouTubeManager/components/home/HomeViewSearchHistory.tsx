import React from 'react';
import { getSearchHistory, deleteSearchHistoryItem, clearSearchHistory, type SearchHistoryItem } from '../../utils/homeView';

interface HomeViewSearchHistoryProps {
    onSelectQuery: (query: string) => void;
}

export const HomeViewSearchHistory: React.FC<HomeViewSearchHistoryProps> = ({ onSelectQuery }) => {
    const [history, setHistory] = React.useState<SearchHistoryItem[]>(() => getSearchHistory());

    if (history.length === 0) return null;

    const handleDelete = (queryStr: string) => {
        deleteSearchHistoryItem(queryStr);
        setHistory(getSearchHistory());
    };

    return (
        <div className="mt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Ricerche recenti</span>
                <button onClick={() => { clearSearchHistory(); setHistory([]); }} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Cancella tutto</button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
                {history.slice(0, 10).map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectQuery(item.query)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md rounded-full transition-all text-xs font-medium whitespace-nowrap text-gray-300 group"
                    >
                        <span className="material-symbols-rounded text-[14px] text-gray-500 group-hover:text-primary transition-colors">history</span>
                        {item.query}
                        <span
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.query); }}
                            className="material-symbols-rounded text-[12px] text-gray-600 hover:text-red-400 transition-colors"
                        >close</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
