import React from 'react';
import { useHomeView, getSavedNews, getSearchHistory, clearSearchHistory, deleteSearchHistoryItem, resolveChannelUrl } from './hooks/useHomeView';
import { NewsDetailModal } from './components/NewsDetailModal';
import { SavedNewsModal } from './components/SavedNewsModal';

export const HomeView: React.FC = () => {
    const {
        query, setQuery,
        filterDate, setFilterDate,
        sortBy, _setSortBy,
        minViews, setMinViews,
        minVelocity, setMinVelocity,
        hideShorts, setHideShorts,
        isSearching,
        results,
        hasSearched,
        error,
        searchHistory, setSearchHistory,
        showSearchDropdown, setShowSearchDropdown,
        newsResults,
        isLoadingNews,
        selectedNews, setSelectedNews,
        modalContent,
        modalYoutube,
        modalLoading,
        modalNotes, setModalNotes,
        modalStatus, setModalStatus,
        showSavedNewsModal, setShowSavedNewsModal,

        handleSearch,
        openNewsModal,
        handleModalStatusChange,
        handleModalNoteChange,
        getFinalScoreColor,
        getFinalScoreBg,
    } = useHomeView();

    return (
        <div className="max-w-[95%] mx-auto space-y-8 animate-fade-in">
            {/* Search Hero */}
            <div className="text-center py-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="flex gap-4 mb-4 relative z-20">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-rounded text-gray-500 group-focus-within:text-purple-400 transition-colors">search</span>
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setShowSearchDropdown(true); }}
                                onFocus={() => setShowSearchDropdown(true)}
                                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); setShowSearchDropdown(false); } }}
                                className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-text-primary placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all shadow-lg shadow-black/20"
                                placeholder="Find viral videos (e.g. 'Minecraft', 'Tech Review')"
                            />
                            {/* Search Suggestions Dropdown */}
                            {showSearchDropdown && searchHistory.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-auto">
                                    <div className="p-2 border-b border-white/5">
                                        <span className="text-xs text-gray-500 px-2">Ricerche recenti</span>
                                    </div>
                                    {searchHistory.filter(h => !query || h.query.toLowerCase().includes(query.toLowerCase())).slice(0, 8).map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer group/item"
                                            onMouseDown={() => { setQuery(item.query); handleSearch(); setShowSearchDropdown(false); }}
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

                    {/* Search Filters */}
                    <div className="flex flex-wrap gap-4 justify-center items-center">
                        <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-surface border border-border-dark rounded-lg px-3 py-2 text-sm text-text-secondary focus:border-primary outline-none"
                        >
                            <option value="all">Any Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => _setSortBy(e.target.value)}
                            className="bg-surface border border-border-dark rounded-lg px-3 py-2 text-sm text-text-secondary focus:border-primary outline-none"
                        >
                            <option value="relevance">Viral Potential (Default)</option>
                            <option value="views">Most Views</option>
                            <option value="date">Newest First</option>
                        </select>

                        <div className="flex items-center gap-2 bg-surface border border-border-dark rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
                            <span className="material-symbols-rounded text-[16px] text-gray-500">visibility</span>
                            <input
                                type="number"
                                value={minViews}
                                onChange={(e) => setMinViews(e.target.value)}
                                min="0"
                                className="bg-transparent border-none outline-none text-sm text-white w-24 placeholder-gray-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-surface border border-border-dark rounded-lg px-3 py-2 focus-within:border-primary transition-colors" title="Minimum Views per Day">
                            <span className="material-symbols-rounded text-[16px] text-gray-500">speed</span>
                            <input
                                type="number"
                                value={minVelocity}
                                onChange={(e) => setMinVelocity(e.target.value)}
                                placeholder="Min Vel/Day"
                                min="0"
                                className="bg-transparent border-none outline-none text-sm text-white w-24 placeholder-gray-500"
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer bg-surface border border-border-dark rounded-lg px-3 py-2 hover:border-primary transition-colors group select-none">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={hideShorts}
                                    onChange={(e) => setHideShorts(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`block w-8 h-4 rounded-full transition-colors ${hideShorts ? 'bg-red-500' : 'bg-[#333] group-hover:bg-[#444]'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${hideShorts ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-sm text-gray-400 group-hover:text-white transition-colors flex items-center gap-1">
                                <span className="material-symbols-rounded text-[16px] text-gray-400">filter_list</span>
                                Filtra Brevi
                            </span>
                        </label>
                    </div>
                </div>

                {/* Search History */}
                {searchHistory.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-xs text-gray-500">Ricerche recenti</span>
                            <button onClick={() => { clearSearchHistory(); setSearchHistory([]); }} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Cancella tutto</button>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
                            {searchHistory.slice(0, 10).map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setQuery(item.query); handleSearch(); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md rounded-full transition-all text-xs font-medium whitespace-nowrap text-gray-300 group"
                                >
                                    <span className="material-symbols-rounded text-[14px] text-gray-500 group-hover:text-primary transition-colors">history</span>
                                    {item.query}
                                    <span
                                        onClick={(e) => { e.stopPropagation(); deleteSearchHistoryItem(item.query); setSearchHistory(getSearchHistory()); }}
                                        className="material-symbols-rounded text-[12px] text-gray-600 hover:text-red-400 transition-colors"
                                    >close</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* News Section - Related to Search Query */}
            {hasSearched && (newsResults.length > 0 || isLoadingNews) && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-orange-500 text-[20px]">newspaper</span>
                            <h3 className="text-lg font-bold text-text-primary">Trend Radar</h3>
                            {isLoadingNews && <span className="material-symbols-rounded animate-spin text-gray-400 text-[16px]">progress_activity</span>}
                        </div>
                        {getSavedNews().size > 0 && (
                            <button onClick={() => setShowSavedNewsModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">
                                <span className="material-symbols-rounded text-[14px]">bookmark</span>
                                Saved ({getSavedNews().size})
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {newsResults.map((news, idx) => {
                            const saved = getSavedNews().get(news.url);
                            return (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 p-3 bg-[#111] border border-border-dark hover:border-orange-500/50 rounded-lg transition-all group"
                                >
                                    {news.finalScore !== undefined && (
                                        <div className={`text-3xl font-black min-w-[48px] text-center px-2 py-1 rounded-lg border ${getFinalScoreBg(news.finalScore)} ${getFinalScoreColor(news.finalScore)}`}>
                                            {news.finalScore}
                                        </div>
                                    )}
                                    <a
                                        href={news.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="min-w-0 flex-1 block"
                                    >
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
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openNewsModal(news); }}
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
            )}

            {/* Conditional Rendering for States */}
            {error && (
                <div className="py-12 border border-dashed text-red-500 border-red-500/20 bg-red-500/5 rounded-xl text-center mt-8">
                    <span className="material-symbols-rounded text-4xl mb-4">error</span>
                    <p>{error}</p>
                </div>
            )}

            {isSearching && (
                <div className="py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#222] rounded-full text-sm text-gray-400 border border-border-dark">
                        <span className="material-symbols-rounded animate-spin text-[18px]">progress_activity</span>
                        <span>Analyzing results...</span>
                    </div>
                </div>
            )}

            {/* Results Grid */}
            {!isSearching && hasSearched && results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-8">
                    {results.map((item, idx) => {
                        // Format views logic
                        let viewsFormatted = "0";
                        if (item.view_count) {
                            const viewsNum = typeof item.view_count === 'string' ? parseInt(item.view_count.replace(/,/g, '')) : item.view_count;
                            if (!isNaN(viewsNum)) {
                                if (viewsNum >= 1000000) {
                                    viewsFormatted = (viewsNum / 1000000).toFixed(1) + 'M';
                                } else if (viewsNum >= 1000) {
                                    viewsFormatted = (viewsNum / 1000).toFixed(1) + 'K';
                                } else {
                                    viewsFormatted = viewsNum.toString();
                                }
                            }
                        }

                        return (
                            <div key={idx} className="group/card bg-[#111] border border-border-dark hover:border-[#444] rounded-xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                                {/* Thumbnail Container */}
                                <div className="relative w-full aspect-video bg-black overflow-hidden">
                                    {item.thumbnail ? (
                                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-rounded text-gray-500 text-3xl">image_not_supported</span>
                                        </div>
                                    )}

                                    {/* Views Badge - Always visible */}
                                    {viewsFormatted !== "0" && (
                                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-gray-300 border border-white/10 flex items-center gap-1 shadow-md">
                                            <span className="material-symbols-rounded text-[12px] text-gray-400">visibility</span>
                                            {viewsFormatted}
                                        </div>
                                    )}

                                    {/* Play Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform">
                                            <span className="material-symbols-rounded text-white">visibility</span>
                                        </div>
                                    </div>

                                    {/* Save Channel Button - Only on hover */}
                                    <div className="absolute top-2 left-2 opacity-0 group-hover/card:opacity-100 transition-opacity translate-y-[-10px] group-hover/card:translate-y-0 duration-300" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const urlToAdd = resolveChannelUrl(item);
                                                const titleToAdd = item.channel_title || 'Unknown Channel';
                                                const thumbnailToAdd = item.thumbnail || '';
                                                const nameGroup = (window as any).currentGroup || null;

                                                if (!urlToAdd) {
                                                    alert("Impossibile risalire al canale da questo risultato.");
                                                    return;
                                                }

                                                if (nameGroup && (window as any).addChannelByUrl) {
                                                    (window as any).addChannelByUrl(nameGroup, urlToAdd, titleToAdd, thumbnailToAdd);
                                                } else if ((window as any).openQuickAddChannelModal) {
                                                    (window as any).openQuickAddChannelModal(null, urlToAdd, titleToAdd, thumbnailToAdd);
                                                } else {
                                                    alert("Seleziona prima un gruppo dalla Library");
                                                }
                                            }}
                                            className="bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-white/10"
                                            title="Aggiungi il canale alla Library"
                                        >
                                            <span className="material-symbols-rounded text-[14px]">add</span>
                                            Canale
                                        </button>
                                    </div>

                                </div>

                                {/* Content Container */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-200 line-clamp-2 leading-tight group-hover/card:text-blue-400 transition-colors" title={item.title}>{item.title}</h4>

                                    <div className="mt-auto pt-3 flex justify-between items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const channelUrl = resolveChannelUrl(item);
                                                const channelTitle = item.channel_title || 'Unknown Channel';
                                                const channelThumbnail = item.thumbnail || '';

                                                const channelData = {
                                                    url: channelUrl,
                                                    title: channelTitle,
                                                    thumbnail: channelThumbnail,
                                                    isChannel: true
                                                };

                                                if ((window as any).openAddToGroupModal) {
                                                    (window as any).openAddToGroupModal(channelData);
                                                }
                                            }}
                                            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 bg-[#222] hover:bg-[#333] px-2 py-1.5 rounded border border-border-dark"
                                        >
                                            <span className="material-symbols-rounded text-[14px]">folder_special</span>
                                            Salva
                                        </button>

                                        <a href={resolveChannelUrl(item) || item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-purple-400 truncate max-w-[100px]" onClick={e => e.stopPropagation()}>
                                            Vedi Fonte
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* No Results State */}
            {!isSearching && hasSearched && results.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No results found for "{query}".</p>
                </div>
            )}

            {/* News Detail Modal */}
            {selectedNews && (
                <NewsDetailModal
                    selectedNews={selectedNews}
                    onClose={() => { setSelectedNews(null); }}
                    modalContent={modalContent}
                    modalLoading={modalLoading}
                    modalYoutube={modalYoutube}
                    modalNotes={modalNotes}
                    modalStatus={modalStatus}
                    onNoteChange={handleModalNoteChange}
                    onStatusChange={handleModalStatusChange}
                />
            )}

            {/* Saved News Modal */}
            <SavedNewsModal
                show={showSavedNewsModal}
                onClose={() => setShowSavedNewsModal(false)}
                onOpenItem={(item) => {
                    setSelectedNews({ title: item.title, url: item.url, source: 'Saved', viralityScore: undefined, tags: undefined, keywordScore: undefined, finalScore: undefined });
                    setModalStatus(item.status);
                    setModalNotes(item.notes);
                    setShowSavedNewsModal(false);
                }}
            />
        </div>
    );
};