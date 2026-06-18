import React from 'react';
import { copyToClipboard, addToStudio } from '../../../../lib/utils';

interface SimilarVideo {
    title: string;
    url: string;
    thumbnail?: string;
    views?: string;
    days_old?: number;
}

interface SimilarVideosModalProps {
    open: boolean;
    videos: SimilarVideo[];
    loading: boolean;
    groupName: string;
    onClose: () => void;
}

export const SimilarVideosModal: React.FC<SimilarVideosModalProps> = ({ open, videos, loading, groupName, onClose }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-purple-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-purple-400 text-[24px]">video_library</span>
                        <h3 className="text-lg font-bold text-white">Video Simili</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <span className="material-symbols-rounded animate-spin mr-2">progress_activity</span>Caricamento...
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-rounded text-4xl mb-2">video_library_off</span>
                            <p>Nessun video simile trovato</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {videos.map((v, i) => (
                                <div key={i} className="bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition-colors group">
                                    <div className="relative aspect-video bg-black">
                                        {v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />}
                                        <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-gray-300 flex items-center gap-0.5">
                                            <span className="material-symbols-rounded text-[10px]">visibility</span>{v.views}
                                        </div>
                                        {v.days_old !== undefined && (
                                            <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
                                                {v.days_old === 0 ? 'Oggi' : v.days_old === 1 ? '1 gg' : v.days_old + ' gg'}
                                            </div>
                                        )}
                                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => addToStudio(v, groupName)} className="bg-black/80 hover:bg-emerald-600 p-1 rounded transition-all" title="Aggiungi a Creator Studio">
                                                <span className="material-symbols-rounded text-[14px] text-white">edit</span>
                                            </button>
                                            <button onClick={() => copyToClipboard(v.url)} className="bg-black/80 hover:bg-purple-600 p-1 rounded transition-all" title="Copia link">
                                                <span className="material-symbols-rounded text-[14px] text-white">link</span>
                                            </button>
                                        </div>
                                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                                                <span className="material-symbols-rounded text-white text-[20px]">visibility</span>
                                            </div>
                                        </a>
                                    </div>
                                    <div className="p-2"><p className="text-xs text-gray-200 line-clamp-2">{v.title}</p></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
