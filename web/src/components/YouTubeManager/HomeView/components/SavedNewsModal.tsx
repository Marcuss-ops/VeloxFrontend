import React, { useState } from 'react';
import type { SavedNewsItem } from '../types';
import { getSavedNews } from '../hooks/useHomeView';

interface SavedNewsModalProps {
    show: boolean;
    onClose: () => void;
    onOpenItem: (item: SavedNewsItem) => void;
}

export const SavedNewsModal: React.FC<SavedNewsModalProps> = ({ show, onClose, onOpenItem }) => {
    // Force re-render on delete by incrementing this counter
    const [refreshKey, setRefreshKey] = useState(0);

    if (!show) return null;

    const savedItems = Array.from(getSavedNews().values());

    const handleDelete = (item: SavedNewsItem) => {
        const saved = getSavedNews();
        saved.delete(item.url);
        localStorage.setItem('yt_saved_news', JSON.stringify(Array.from(saved.values())));
        setRefreshKey(k => k + 1);
    };

    return (
        <div key={refreshKey} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-blue-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-blue-400 text-[24px]">bookmark</span>
                        <h3 className="text-lg font-bold text-white">News Salvate</h3>
                        <span className="text-sm text-gray-500">({savedItems.length} elementi)</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    {savedItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-rounded text-4xl mb-2">bookmark_border</span>
                            <p>Nessuna news salvata</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {savedItems.sort((a, b) => b.savedAt - a.savedAt).map((item) => (
                                <div key={item.url} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-blue-400 transition-colors line-clamp-2">{item.title}</a>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'watchlist' ? 'bg-blue-500/30 text-blue-300' : item.status === 'todo' ? 'bg-green-500/30 text-green-300' : item.status === 'ignored' ? 'bg-gray-500/30 text-gray-300' : 'bg-purple-500/30 text-purple-300'}`}>
                                                    {item.status === 'watchlist' ? 'Watchlist' : item.status === 'todo' ? 'Da Fare' : item.status === 'ignored' ? 'Ignorato' : 'Archiviato'}
                                                </span>
                                                <span className="text-[10px] text-gray-500">{new Date(item.savedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onOpenItem(item)} className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">Apri</button>
                                            <button onClick={() => handleDelete(item)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-medium transition-all">Elimina</button>
                                        </div>
                                    </div>
                                    {(item.notes.hook || item.notes.cut || item.notes.thumbnail) && (
                                        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {item.notes.hook && <div><span className="text-[10px] text-gray-500 uppercase">Hook</span><p className="text-xs text-gray-300 mt-0.5">{item.notes.hook}</p></div>}
                                            {item.notes.cut && <div><span className="text-[10px] text-gray-500 uppercase">Struttura</span><p className="text-xs text-gray-300 mt-0.5">{item.notes.cut}</p></div>}
                                            {item.notes.thumbnail && <div><span className="text-[10px] text-gray-500 uppercase">Thumbnail</span><p className="text-xs text-gray-300 mt-0.5">{item.notes.thumbnail}</p></div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};