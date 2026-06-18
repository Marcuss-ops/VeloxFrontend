import React, { useState, useEffect, useRef } from 'react';
import { getSearchHistory, saveSearchToHistory, deleteSearchHistoryItem, clearSearchHistory, type SearchHistoryItem } from '../../utils/homeView';

interface HomeViewSearchBarProps {
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: () => void;
    isSearching: boolean;
}

export const HomeViewSearchBar: React.FC<HomeViewSearchBarProps> = ({ query, onQueryChange, onSearch, isSearching }) => {
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory());
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = () => {
        if (!query.trim()) return;
        saveSearchToHistory(query);
        setSearchHistory(getSearchHistory());
        setShowSearchDropdown(false);
        onSearch();
    };

    const filteredHistory = searchHistory.filter(h => !query || h.query.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

    return (
        <div className="flex gap-4 mb-4 relative z-20" ref={dropdownRef}>
            <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-rounded text-gray-500 group-focus-within:text-purple-400 transition-colors">search</span>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { onQueryChange(e.target.value); setShowSearchDropdown(true); }}
                    onFocus={() => setShowSearchDropdown(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-text-primary placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all shadow-lg shadow-black/20"
                    placeholder="Find viral videos (e.g. 'Minecraft', 'Tech Review')"
                />
                {showSearchDropdown && filteredHistory.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-auto">
                        <div className="p-2 border-b border-white/5">
                            <span className="text-xs text-gray-500 px-2">Ricerche recenti</span>
                        </div>
                        {filteredHistory.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer group/item"
                                onMouseDown={() => { onQueryChange(item.query); setShowSearchDropdown(false); }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-rounded text-[16px] text-gray-500">history</span>
                                    <span className="text-sm text-gray-300">{item.query}</span>
                                    {item.count > 1 && <span className="text-[10px] text-gray-600">({item.count}x)</span>}
                                </div>
                                <button
                                    onMouseDown={(e) => { e.stopPropagation(); deleteSearchHistoryItem(item.query); setSearchHistory(getSearchHistory()); }}
                                    className="opacity-0 group-hover/item:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                                >
                                    <span className="material-symbols-rounded text-[14px]">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={handleSearch}
                disabled={isSearching}
                className={`bg-gradient-to-r ${isSearching ? 'from-gray-600 to-gray-600' : 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'} text-text-primary px-8 rounded-2xl font-bold transition-all shadow-lg shadow-red-900/20 active:scale-95 flex items-center gap-2`}
            >
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
        </div>
    );
};
