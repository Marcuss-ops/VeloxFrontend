import React from 'react';
import type { FeedItem } from '../../../../lib/utils';
import { extractVideoId, copyToClipboard, addToStudio } from '../../../../lib/utils';
import { formatViewCount } from '../../utils/groupFeed';

interface RelatedVideo {
    title: string;
    url: string;
    thumbnail?: string;
    views?: string;
    days_old?: number;
}

interface GroupFeedVideoModalProps {
    video: FeedItem;
    related: RelatedVideo[];
    loading: boolean;
    groupName: string;
    onClose: () => void;
}

export const GroupFeedVideoModal: React.FC<GroupFeedVideoModalProps> = ({ video, related, loading, groupName, onClose }) => {
    const views = formatViewCount(video.view_count);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-red-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {video.channel_title || video.uploader} • {views ? `${views} views` : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => addToStudio(video, groupName)}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                        >
                            <span className="material-symbols-rounded text-[14px]">edit</span>
                            Studio
                        </button>
                        <button
                            onClick={() => copyToClipboard(video.url || '')}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                        >
                            <span className="material-symbols-rounded text-[14px]">link</span>
                            Copia
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-6">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden max-w-4xl mx-auto">
                        {extractVideoId(video.url) ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${extractVideoId(video.url)}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <span className="material-symbols-rounded text-4xl">videocam_off</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                            <span className="material-symbols-rounded text-[16px]">video_library</span> Video Correlati
                        </h4>
                        {loading ? (
                            <div className="flex items-center gap-2 text-gray-500 py-4">
                                <span className="material-symbols-rounded animate-spin">progress_activity</span> Caricamento...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {related.map((v, i) => (
                                    <div key={i} className="flex gap-2 p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 group relative">
                                        <div className="w-28 h-16 bg-black rounded overflow-hidden shrink-0 relative">
                                            {v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />}
                                            <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); addToStudio(v, groupName); }} className="bg-black/80 hover:bg-emerald-600 p-0.5 rounded transition-all" title="Aggiungi a Creator Studio">
                                                    <span className="material-symbols-rounded text-[12px] text-white">edit</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(v.url); }} className="bg-black/80 hover:bg-purple-600 p-0.5 rounded transition-all" title="Copia link">
                                                    <span className="material-symbols-rounded text-[12px] text-white">link</span>
                                                </button>
                                            </div>
                                        </div>
                                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 block">
                                            <p className="text-xs text-gray-200 line-clamp-2 group-hover:text-red-400">{v.title}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                                {v.views} views
                                                {v.days_old !== undefined ? ` • ${v.days_old === 0 ? 'Oggi' : v.days_old === 1 ? '1 gg' : v.days_old + ' gg'}` : ''}
                                            </p>
                                        </a>
                                    </div>
                                ))}
                                {related.length === 0 && !loading && <p className="text-xs text-gray-500">Nessun video correlato trovato</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
