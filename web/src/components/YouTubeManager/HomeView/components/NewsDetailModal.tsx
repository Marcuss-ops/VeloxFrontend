import React from 'react';
import type { NewsItem, NewsStatus } from '../types';

interface NewsDetailModalProps {
    selectedNews: NewsItem;
    onClose: () => void;
    modalContent: string;
    modalLoading: boolean;
    modalYoutube: { title: string; url: string; thumbnail?: string; views?: string }[];
    modalNotes: { hook: string; cut: string; thumbnail: string };
    modalStatus: NewsStatus | null;
    onNoteChange: (field: 'hook' | 'cut' | 'thumbnail', value: string) => void;
    onStatusChange: (status: NewsStatus) => void;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
    selectedNews,
    onClose,
    modalContent,
    modalLoading,
    modalYoutube,
    modalNotes,
    modalStatus,
    onNoteChange,
    onStatusChange,
}) => {
    if (!selectedNews) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white line-clamp-2">{selectedNews.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{selectedNews.source} • Score: {selectedNews.finalScore}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-6">
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">article</span> Info</h4>
                        {modalLoading ? <div className="flex items-center gap-2 text-gray-500"><span className="material-symbols-rounded animate-spin">progress_activity</span> Caricamento...</div> : <p className="text-sm text-gray-300 leading-relaxed">{modalContent || 'Contenuto non disponibile'}</p>}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">video_library</span> Video Esistenti</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modalYoutube.map((v, i) => (
                                <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 group">
                                    <div className="w-24 h-14 bg-black rounded overflow-hidden shrink-0">{v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />}</div>
                                    <div className="min-w-0 flex-1"><p className="text-xs text-gray-200 line-clamp-2 group-hover:text-red-400">{v.title}</p>{v.views && <p className="text-[10px] text-gray-500 mt-1">{v.views} views</p>}</div>
                                </a>
                            ))}
                            {modalYoutube.length === 0 && !modalLoading && <p className="text-xs text-gray-500">Nessun video trovato</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">edit_note</span> Note Personali</h4>
                        <div className="space-y-3">
                            <div><label className="text-[10px] text-gray-500 uppercase">Idea Hook</label><input value={modalNotes.hook} onChange={e => onNoteChange('hook', e.target.value)} placeholder="Hook iniziale..." className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /></div>
                            <div><label className="text-[10px] text-gray-500 uppercase">Taglio del Video</label><input value={modalNotes.cut} onChange={e => onNoteChange('cut', e.target.value)} placeholder="Come strutturare..." className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /></div>
                            <div><label className="text-[10px] text-gray-500 uppercase">Thumbnail Idea</label><input value={modalNotes.thumbnail} onChange={e => onNoteChange('thumbnail', e.target.value)} placeholder="Idea thumbnail..." className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /></div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-white/10 bg-slate-800/50">
                    <div className="flex flex-wrap gap-2">
                        {(['watchlist', 'todo', 'ignored', 'archived'] as const).map(status => (
                            <button key={status} onClick={() => onStatusChange(status)} className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${modalStatus === status ? (status === 'watchlist' ? 'bg-blue-600' : status === 'todo' ? 'bg-green-600' : status === 'ignored' ? 'bg-gray-600' : 'bg-purple-600') + ' text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                                <span className="material-symbols-rounded text-[14px]">{status === 'watchlist' ? 'bookmark' : status === 'todo' ? 'checklist' : status === 'ignored' ? 'block' : 'archive'}</span>
                                {status === 'watchlist' ? 'Watchlist' : status === 'todo' ? 'Da Fare' : status === 'ignored' ? 'Ignora' : 'Archivia'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};