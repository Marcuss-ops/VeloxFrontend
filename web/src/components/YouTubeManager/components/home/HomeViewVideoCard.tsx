import React from 'react';
import { formatViewCount, resolveChannelUrl, type YouTubeResult } from '../../utils/homeView';

interface HomeViewVideoCardProps {
    item: YouTubeResult;
}

export const HomeViewVideoCard: React.FC<HomeViewVideoCardProps> = ({ item }) => {
    const viewsFormatted = formatViewCount(item.view_count);

    return (
        <div className="group/card bg-[#111] border border-border-dark hover:border-[#444] rounded-xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
            {/* Thumbnail */}
            <div className="relative w-full aspect-video bg-black overflow-hidden">
                {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-rounded text-gray-500 text-3xl">image_not_supported</span>
                    </div>
                )}

                {viewsFormatted !== "0" && (
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-gray-300 border border-white/10 flex items-center gap-1 shadow-md">
                        <span className="material-symbols-rounded text-[12px] text-gray-400">visibility</span>
                        {viewsFormatted}
                    </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform">
                        <span className="material-symbols-rounded text-white">visibility</span>
                    </div>
                </div>

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

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <h4 className="text-sm font-bold text-gray-200 line-clamp-2 leading-tight group-hover/card:text-blue-400 transition-colors" title={item.title}>{item.title}</h4>
                <div className="mt-auto pt-3 flex justify-between items-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const channelUrl = resolveChannelUrl(item);
                            const channelTitle = item.channel_title || 'Unknown Channel';
                            const channelThumbnail = item.thumbnail || '';
                            const channelData = { url: channelUrl, title: channelTitle, thumbnail: channelThumbnail, isChannel: true };
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
};
