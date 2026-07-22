import React from 'react';
import { NEWS_STATUS_META, getSavedNews, type SavedNewsItem, type NewsStatus } from '../../../../lib/utils';

interface GroupFeedSavedNewsModalProps {
    selectedUrls: Set<string>;
    onClose: () => void;
    onToggleSelect: (url: string) => void;
    onToggleSelectAll: () => void;
    onBulkChangeStatus: (status: NewsStatus) => void;
    onBulkDelete: () => void;
    onOpenNews: (item: SavedNewsItem) => void;
}

export const GroupFeedSavedNewsModal: React.FC<GroupFeedSavedNewsModalProps> = ({
    selectedUrls,
    onClose,
    onToggleSelect,
    onToggleSelectAll,
    onBulkChangeStatus,
    onBulkDelete,
    onOpenNews,
}) => {
    const savedNews = Array.from(getSavedNews().values());
    const allUrls = Array.from(getSavedNews().keys());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => { onClose(); }}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-blue-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-blue-400 text-[24px]">bookmark</span>
                        <h3 className="text-lg font-bold text-white">News Salvate</h3>
                        <span className="text-sm text-gray-500">({savedNews.length} elementi)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedUrls.size > 0 && (
                            <>
                                <span className="text-xs text-gray-400">{selectedUrls.size} selezionati</span>
                                {(['watchlist', 'todo', 'ignored', 'archived'] as NewsStatus[]).map(s => (
                                    <button key={s} onClick={() => onBulkChangeStatus(s)} className={`px-2 py-1 ${NEWS_STATUS_META[s].bgClass} ${NEWS_STATUS_META[s].hoverBgClass} ${NEWS_STATUS_META[s].colorClass} hover:text-white rounded text-xs transition-all`}>
                                        {NEWS_STATUS_META[s].shortLabel}
                                    </button>
                                ))}
                                <button onClick={onBulkDelete} className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs transition-all">Elimina</button>
                            </>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    {savedNews.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-rounded text-4xl mb-2">bookmark_border</span>
                            <p>Nessuna news salvata</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
                                <input
                                    type="checkbox"
                                    checked={selectedUrls.size === allUrls.length}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                                />
                                <span className="text-xs text-gray-400">Seleziona tutti</span>
                            </div>
                            <div className="space-y-3">
                                {savedNews.sort((a, b) => b.savedAt - a.savedAt).map((item) => (
                                    <div key={item.url} className={`bg-slate-800/50 rounded-xl p-4 border transition-colors ${selectedUrls.has(item.url) ? 'border-purple-500' : 'border-slate-700 hover:border-slate-600'}`}>
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedUrls.has(item.url)}
                                                onChange={() => onToggleSelect(item.url)}
                                                className="w-4 h-4 mt-1 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-blue-400 transition-colors line-clamp-2">{item.title}</a>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${NEWS_STATUS_META[item.status].bgClass} ${NEWS_STATUS_META[item.status].colorClass}`}>
                                                        {NEWS_STATUS_META[item.status].label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">{new Date(item.savedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {(item.notes.hook || item.notes.cut || item.notes.thumbnail) && (
                                                    <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                        {item.notes.hook && <div><span className="text-[10px] text-gray-500 uppercase">Hook</span><p className="text-xs text-gray-300 mt-0.5">{item.notes.hook}</p></div>}
                                                        {item.notes.cut && <div><span className="text-[10px] text-gray-500 uppercase">Struttura</span><p className="text-xs text-gray-300 mt-0.5">{item.notes.cut}</p></div>}
                                                        {item.notes.thumbnail && <div><span className="text-[10px] text-gray-500 uppercase">Thumbnail</span><p className="text-xs text-gray-300 mt-0.5">{item.notes.thumbnail}</p></div>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => onOpenNews(item)} className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">Apri</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
