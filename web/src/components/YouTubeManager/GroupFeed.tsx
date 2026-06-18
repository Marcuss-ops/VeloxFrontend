import React, { useState } from 'react';
import { extractVideoId, copyToClipboard, addToStudio, resolveChannelLink, getSavedNews, type NewsItem, type FeedItem } from '../../lib/utils';
import { useGroupFeedData } from './hooks/useGroupFeedData';
import { useGroupFeedModals } from './hooks/useGroupFeedModals';

interface GroupFeedProps {
    groupName: string;
    dateFilter: string;
    channels?: unknown[];
}

const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Adesso';
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
};

const getFinalScoreColor = (score: number): string => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 80) return 'text-amber-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-gray-400';
};

const getFinalScoreBg = (score: number): string => {
    if (score >= 100) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 80) return 'bg-amber-500/20 border-amber-500/30';
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-gray-500/20 border-gray-500/30';
};

export const GroupFeed: React.FC<GroupFeedProps> = ({ groupName, dateFilter, channels = [] }) => {
    const {
        isLoading,
        feed,
        competitorFeed,
        news,
        setNews,
        competitors,
        nicheTags,
        setNicheTags,
        macroNews,
        trendingNews,
        trendingNewsLoading,
        saveTags,
        clearNewsCache,
    } = useGroupFeedData(groupName, dateFilter, channels);

    const modals = useGroupFeedModals(groupName);

    // Tag input local state
    const [newTag, setNewTag] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);

    if (isLoading) {
        return <div className="flex items-center justify-center w-full py-8 text-gray-500"><span className="material-symbols-rounded animate-spin mr-2">progress_activity</span>Loading...</div>;
    }

    const explosiveVideos = feed.filter(v => v.velocity && v.velocity > 1500 && v.days_old !== undefined && v.days_old <= 3).sort((a, b) => (b.velocity || 0) - (a.velocity || 0));

    const getRelevanceColor = (score: number): string => {
        if (score >= 70) return 'bg-emerald-500/80';
        if (score >= 50) return 'bg-amber-500/80';
        if (score >= 30) return 'bg-orange-500/80';
        return 'bg-gray-500/80';
    };

    const renderVideoCard = (vid: FeedItem & { relevanceScore?: number; matchedTags?: string[] }, idx: number, isExplosive = false) => {
        const views = vid.view_count ? (vid.view_count >= 1000000 ? (vid.view_count / 1000000).toFixed(1) + 'M' : vid.view_count >= 1000 ? (vid.view_count / 1000).toFixed(1) + 'K' : String(vid.view_count)) : '';
        const showRelevance = vid.relevanceScore !== undefined && vid.relevanceScore > 0;
        return (
            <div key={idx} onClick={() => modals.openVideoModal(vid)}
                className={`min-w-[250px] max-w-[280px] bg-[#111] border ${isExplosive ? 'border-orange-500/50' : 'border-border-dark hover:border-red-500/50'} p-3 rounded-lg flex flex-col gap-2 shrink-0 group cursor-pointer transition-all relative`}>
                <div className="relative w-full aspect-video rounded overflow-hidden bg-black">
                    {vid.thumbnail ? <img src={vid.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" /> : <span className="material-symbols-rounded text-gray-600">movie</span>}
                    {views && <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-gray-300"><span className="material-symbols-rounded text-[10px]">visibility</span> {views}</div>}
                    {isExplosive && <div className="absolute top-1 right-12 bg-gradient-to-r from-orange-600 to-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-0.5"><span className="material-symbols-rounded text-[12px]">local_fire_department</span></div>}
                    {showRelevance && (
                        <div className={`absolute bottom-1 right-1 ${getRelevanceColor(vid.relevanceScore!)} px-1.5 py-0.5 rounded text-[9px] font-bold text-white`} title={`Relevance: ${vid.relevanceScore}${vid.matchedTags?.length ? ` - Tags: ${vid.matchedTags.join(', ')}` : ''}`}>
                            {vid.relevanceScore}%
                        </div>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); addToStudio(vid, groupName); }} className="bg-black/80 hover:bg-emerald-600 p-1 rounded transition-all" title="Aggiungi a Creator Studio">
                            <span className="material-symbols-rounded text-[14px] text-white">edit</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(vid.url || ''); }} className="bg-black/80 hover:bg-purple-600 p-1 rounded transition-all" title="Copia link">
                            <span className="material-symbols-rounded text-[14px] text-white">link</span>
                        </button>
                    </div>
                </div>
                <h5 className="text-sm font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors">{vid.title}</h5>
                <div className="flex justify-between text-xs text-gray-400">
                    <span className="truncate">{vid.channel_title || vid.uploader}</span>
                    <span>{vid.days_old === 0 ? 'Oggi' : vid.days_old === 1 ? '1 gg' : vid.days_old ? `${vid.days_old} gg` : ''}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-6 space-y-6 border-t border-white/5 pt-6">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Tag Nicchia:</span>
                {nicheTags.map(tag => (
                    <span key={tag} className="group flex items-center gap-1 bg-[#1a1a1a] border border-[#333] hover:border-red-500/50 px-2 py-0.5 rounded-full text-xs text-gray-300">
                        {tag}
                        <button onClick={() => { const updated = nicheTags.filter(t => t !== tag); setNicheTags(updated); saveTags(updated); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"><span className="material-symbols-rounded text-[12px]">close</span></button>
                    </span>
                ))}
                {showTagInput ? (
                    <input
                        autoFocus
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && newTag.trim()) {
                                // Split by comma and add each tag separately (like YouTube)
                                const newTags = newTag
                                    .split(',')
                                    .map(t => t.trim().toLowerCase())
                                    .filter(t => t && !nicheTags.includes(t));
                                if (newTags.length > 0) {
                                    const updated = [...nicheTags, ...newTags];
                                    setNicheTags(updated);
                                    saveTags(updated);
                                }
                                setNewTag('');
                                setShowTagInput(false);
                            }
                        }}
                        onBlur={() => {
                            // Also process on blur if there's content
                            if (newTag.trim()) {
                                const newTags = newTag
                                    .split(',')
                                    .map(t => t.trim().toLowerCase())
                                    .filter(t => t && !nicheTags.includes(t));
                                if (newTags.length > 0) {
                                    const updated = [...nicheTags, ...newTags];
                                    setNicheTags(updated);
                                    saveTags(updated);
                                }
                            }
                            setNewTag('');
                            setShowTagInput(false);
                        }}
                        placeholder="tag1, tag2, tag3..."
                        className="bg-[#222] border border-purple-500/50 rounded-full px-2 py-0.5 text-xs text-white outline-none w-40 placeholder:text-gray-600"
                    />
                ) : (
                    <button onClick={() => setShowTagInput(true)} className="text-gray-600 hover:text-purple-400" title="Aggiungi tag (separa con virgola)"><span className="material-symbols-rounded text-[14px]">add_circle</span></button>
                )}
            </div>

            {/* Explosive Videos */}
            {explosiveVideos.length > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl">
                    <h4 className="text-sm font-bold text-orange-500 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[18px]">rocket_launch</span> Video Esplosivi</h4>
                    <div className="flex overflow-x-auto gap-4">{explosiveVideos.map((v, i) => renderVideoCard(v, i, true))}</div>
                </div>
            )}

            {/* Competitors */}
            {competitors.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px] text-purple-400">group_add</span> Canali Simili</h4>
                    <div className="flex overflow-x-auto gap-3">
                        {competitors.map((ch, idx) => (
                            <div key={idx} className="min-w-[200px] bg-[#1a1a1a] p-3 rounded-lg border border-border-dark flex items-center gap-3 group/comp relative">
                                {ch.thumbnail ? <img src={ch.thumbnail} className="w-10 h-10 rounded-full" alt="" /> : <div className="w-10 h-10 rounded-full bg-[#333]" />}
                                <div><h5 className="text-sm font-bold truncate text-white">{ch.channel || ch.title}</h5><a href={resolveChannelLink(ch) || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">Vedi</a></div>
                                <button onClick={() => (window as any).openQuickAddChannelModal?.(groupName, resolveChannelLink(ch))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full opacity-0 group-hover/comp:opacity-100 transition-all"><span className="material-symbols-rounded text-[18px]">add</span></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feed */}
            {feed.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><span className="material-symbols-rounded text-[16px] text-red-500">video_library</span> Video Trend</h4>
                        <button onClick={() => modals.openSimilarVideosModal(nicheTags.slice(0, 3).join(' '))} className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">
                            <span className="material-symbols-rounded text-[14px]">add</span>
                            Simili
                        </button>
                    </div>
                    <div className="flex overflow-x-auto gap-4">{feed.map((v, i) => renderVideoCard(v, i))}</div>
                </div>
            )}

            {/* Competitor Feed */}
            {competitorFeed.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px] text-orange-500">whatshot</span> Video Competitor ({nicheTags.slice(0, 3).join(', ')})</h4>
                    <div className="flex overflow-x-auto gap-4">{competitorFeed.map((v, i) => renderVideoCard(v, i))}</div>
                </div>
            )}

            {/* Trending News - External News Sources */}
            <div className="pt-4 border-t border-[#222]">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                        <span className="material-symbols-rounded text-[16px] text-cyan-400">public</span>
                        News Trend del Momento
                        <span className="text-[10px] text-gray-600 font-normal">(fonti esterne)</span>
                    </h4>
                    {trendingNewsLoading && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="material-symbols-rounded animate-spin text-[14px]">progress_activity</span>
                            Caricamento...
                        </span>
                    )}
                </div>

                {trendingNews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {trendingNews.map((item, idx) => {
                            const pubDate = item.published_at ? new Date(item.published_at) : null;
                            const timeAgo = pubDate ? getTimeAgo(pubDate) : '';

                            return (
                                <a
                                    key={idx}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-border-dark hover:border-cyan-500/50 transition-all group"
                                >
                                    {item.image_url && (
                                        <div className="w-20 h-20 rounded overflow-hidden bg-slate-800 shrink-0">
                                            <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-200 line-clamp-2 group-hover:text-cyan-400 transition-colors mb-1">
                                            {item.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <span className="truncate">{item.source}</span>
                                            {timeAgo && <span>• {timeAgo}</span>}
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : !trendingNewsLoading ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                        <span className="material-symbols-rounded text-3xl mb-2">newspaper</span>
                        <p>Nessuna news trovata per questa nicchia.</p>
                    </div>
                ) : null}
            </div>

            {/* News */}
            {(macroNews.length > 0 || news.length > 0) && (
                <div className="pt-4 border-t border-[#222]">
                    {/* Macro News - General Niche Trends */}
                    {macroNews.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-[16px] text-amber-400">trending_up</span>
                                    Trending in {groupName}
                                    <span className="text-[10px] text-gray-600 font-normal">(macro)</span>
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                {macroNews.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20 hover:border-amber-500/40 transition-colors group">
                                        {item.finalScore !== undefined && (
                                            <div className={`text-2xl font-black min-w-[40px] text-center px-1 py-0.5 rounded border ${getFinalScoreBg(item.finalScore)} ${getFinalScoreColor(item.finalScore)}`}>{item.finalScore}</div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] text-gray-200 line-clamp-2 group-hover:text-amber-400 transition-colors">{item.title}</p>
                                            <span className="text-[9px] text-gray-500">{item.source}</span>
                                        </div>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); modals.openNewsModal(item); }} className="shrink-0 w-6 h-6 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-full flex items-center justify-center transition-all" title="Ispeziona"><span className="material-symbols-rounded text-[14px]">add</span></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Micro News - Personalized by Tags */}
                    {news.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-[16px] text-blue-400">newspaper</span>
                                    I Tuoi Interessi
                                    <span className="text-[10px] text-gray-600 font-normal">({nicheTags.slice(0, 3).join(', ')})</span>
                                </h4>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { clearNewsCache(); setNews([]); }} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-medium transition-all" title="Aggiorna news">
                                        <span className="material-symbols-rounded text-[14px]">refresh</span>
                                        Refresh
                                    </button>
                                    {getSavedNews().size > 0 && (
                                        <button onClick={() => modals.setShowSavedNewsModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">
                                            <span className="material-symbols-rounded text-[14px]">bookmark</span>
                                            Saved ({getSavedNews().size})
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {news.map((item, idx) => {
                                    const saved = getSavedNews().get(item.url);
                                    return (
                                        <div key={idx} className="flex items-center gap-2 p-3 bg-[#222] rounded-lg border border-border-dark hover:border-blue-500/50 transition-colors group">
                                            {item.finalScore !== undefined && (
                                                <div className={`text-3xl font-black min-w-[48px] text-center px-2 py-1 rounded-lg border ${getFinalScoreBg(item.finalScore)} ${getFinalScoreColor(item.finalScore)}`}>{item.finalScore}</div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">{item.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-gray-500">{item.source}</span>
                                                    {item.keywordScore ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300">+{item.keywordScore}</span> : null}
                                                    {saved && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300">{saved.status}</span>}
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); modals.openNewsModal(item); }} className="shrink-0 w-8 h-8 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full flex items-center justify-center transition-all" title="Ispeziona"><span className="material-symbols-rounded text-[18px]">add</span></button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modals.selectedNews && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => modals.setSelectedNews(null)}>
                    <div className="bg-slate-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white line-clamp-2">{modals.selectedNews.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">{modals.selectedNews.source} • Score: {modals.selectedNews.finalScore}</p>
                            </div>
                            <button onClick={() => modals.setSelectedNews(null)} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-6">
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">article</span> Contenuto Articolo</h4>
                                {modals.modalLoading ? <div className="flex items-center gap-2 text-gray-500"><span className="material-symbols-rounded animate-spin">progress_activity</span> Caricamento...</div> : <p className="text-sm text-gray-300 leading-relaxed">{modals.modalContent || 'Contenuto non disponibile'}</p>}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">video_library</span> Video YouTube Esistenti</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {modals.modalYoutube.map((v, i) => (
                                        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 group">
                                            <div className="w-24 h-14 bg-black rounded overflow-hidden shrink-0">{v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />}</div>
                                            <div className="min-w-0 flex-1"><p className="text-xs text-gray-200 line-clamp-2 group-hover:text-red-400">{v.title}</p>{v.views && <p className="text-[10px] text-gray-500 mt-1">{v.views} views</p>}</div>
                                        </a>
                                    ))}
                                    {modals.modalYoutube.length === 0 && !modals.modalLoading && <p className="text-xs text-gray-500">Nessun video trovato</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">edit_note</span> Note Personali</h4>
                                <div className="space-y-3">
                                    <div><label className="text-[10px] text-gray-500 uppercase">Idea Hook</label><input value={modals.modalNotes.hook} onChange={e => modals.handleModalNoteChange('hook', e.target.value)} placeholder="Hook iniziale..." className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /></div>
                                    <div><label className="text-[10px] text-gray-500 uppercase">Taglio del Video</label><input value={modals.modalNotes.cut} onChange={e => modals.handleModalNoteChange('cut', e.target.value)} placeholder="Come strutturare..." className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /></div>
                                    <div><label className="text-[10px] text-gray-500 uppercase">Thumbnail Idea</label><input value={modals.modalNotes.thumbnail} onChange={e => modals.handleModalNoteChange('thumbnail', e.target.value)} placeholder="Idea thumbnail..." className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-slate-800/50">
                            <div className="flex flex-wrap gap-2">
                                {(['watchlist', 'todo', 'ignored', 'archived'] as const).map(status => (
                                    <button key={status} onClick={() => modals.handleModalStatusChange(status)} className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${modals.modalStatus === status ? (status === 'watchlist' ? 'bg-blue-600' : status === 'todo' ? 'bg-green-600' : status === 'ignored' ? 'bg-gray-600' : 'bg-purple-600') + ' text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                                        <span className="material-symbols-rounded text-[14px]">{status === 'watchlist' ? 'bookmark' : status === 'todo' ? 'checklist' : status === 'ignored' ? 'block' : 'archive'}</span>
                                        {status === 'watchlist' ? 'Watchlist' : status === 'todo' ? 'Da Fare' : status === 'ignored' ? 'Ignora' : 'Archivia'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved News Modal */}
            {modals.showSavedNewsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => { modals.setShowSavedNewsModal(false); modals.setSelectedUrls(new Set()); }}>
                    <div className="bg-slate-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-blue-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-rounded text-blue-400 text-[24px]">bookmark</span>
                                <h3 className="text-lg font-bold text-white">News Salvate</h3>
                                <span className="text-sm text-gray-500">({getSavedNews().size} elementi)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {modals.selectedUrls.size > 0 && (
                                    <>
                                        <span className="text-xs text-gray-400">{modals.selectedUrls.size} selezionati</span>
                                        <button onClick={() => modals.bulkChangeStatus('watchlist')} className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-xs transition-all">Watchlist</button>
                                        <button onClick={() => modals.bulkChangeStatus('todo')} className="px-2 py-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded text-xs transition-all">Da Fare</button>
                                        <button onClick={() => modals.bulkChangeStatus('ignored')} className="px-2 py-1 bg-gray-600/20 hover:bg-gray-600 text-gray-400 hover:text-white rounded text-xs transition-all">Ignora</button>
                                        <button onClick={() => modals.bulkChangeStatus('archived')} className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded text-xs transition-all">Archivia</button>
                                        <button onClick={modals.bulkDelete} className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs transition-all">Elimina</button>
                                    </>
                                )}
                                <button onClick={() => modals.setShowSavedNewsModal(false)} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {Array.from(getSavedNews().values()).length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <span className="material-symbols-rounded text-4xl mb-2">bookmark_border</span>
                                    <p>Nessuna news salvata</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
                                        <input type="checkbox" checked={modals.selectedUrls.size === Array.from(getSavedNews().keys()).length} onChange={modals.toggleSelectAll} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500" />
                                        <span className="text-xs text-gray-400">Seleziona tutti</span>
                                    </div>
                                    <div className="space-y-3">
                                        {Array.from(getSavedNews().values()).sort((a, b) => b.savedAt - a.savedAt).map((item) => (
                                            <div key={item.url} className={`bg-slate-800/50 rounded-xl p-4 border transition-colors ${modals.selectedUrls.has(item.url) ? 'border-purple-500' : 'border-slate-700 hover:border-slate-600'}`}>
                                                <div className="flex items-start gap-3">
                                                    <input type="checkbox" checked={modals.selectedUrls.has(item.url)} onChange={() => modals.toggleSelect(item.url)} className="w-4 h-4 mt-1 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500" />
                                                    <div className="flex-1 min-w-0">
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-blue-400 transition-colors line-clamp-2">{item.title}</a>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'watchlist' ? 'bg-blue-500/30 text-blue-300' : item.status === 'todo' ? 'bg-green-500/30 text-green-300' : item.status === 'ignored' ? 'bg-gray-500/30 text-gray-300' : 'bg-purple-500/30 text-purple-300'}`}>
                                                                {item.status === 'watchlist' ? 'Watchlist' : item.status === 'todo' ? 'Da Fare' : item.status === 'ignored' ? 'Ignorato' : 'Archiviato'}
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
                                                        <button onClick={() => { const newsItem = news.find(n => n.url === item.url) || { title: item.title, url: item.url, source: 'Saved' }; modals.setSelectedNews(newsItem as NewsItem); modals.setModalStatus(item.status); modals.setModalNotes(item.notes); modals.setShowSavedNewsModal(false); }} className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all">Apri</button>
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
            )}

            {feed.length === 0 && news.length === 0 && competitorFeed.length === 0 && (
                <div className="text-center py-6 text-gray-500">Nessun dato per questo periodo.</div>
            )}

            {/* Video Modal */}
            {modals.selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => modals.setSelectedVideo(null)}>
                    <div className="bg-slate-900 rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-red-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white line-clamp-2">{modals.selectedVideo.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">{modals.selectedVideo.channel_title || modals.selectedVideo.uploader} • {modals.selectedVideo.view_count ? (modals.selectedVideo.view_count >= 1000000 ? (modals.selectedVideo.view_count / 1000000).toFixed(1) + 'M' : modals.selectedVideo.view_count >= 1000 ? (modals.selectedVideo.view_count / 1000).toFixed(1) + 'K' : modals.selectedVideo.view_count) + ' views' : ''}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => addToStudio(modals.selectedVideo!, groupName)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                                    <span className="material-symbols-rounded text-[14px]">edit</span>
                                    Studio
                                </button>
                                <button onClick={() => copyToClipboard(modals.selectedVideo!.url || '')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                                    <span className="material-symbols-rounded text-[14px]">link</span>
                                    Copia
                                </button>
                                <button onClick={() => modals.setSelectedVideo(null)} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-6">
                            <div className="aspect-video bg-black rounded-xl overflow-hidden max-w-4xl mx-auto">
                                {extractVideoId(modals.selectedVideo.url) ? (
                                    <iframe src={`https://www.youtube.com/embed/${extractVideoId(modals.selectedVideo.url)}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500"><span className="material-symbols-rounded text-4xl">videocam_off</span></div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><span className="material-symbols-rounded text-[16px]">video_library</span> Video Correlati</h4>
                                {modals.videoModalLoading ? (
                                    <div className="flex items-center gap-2 text-gray-500 py-4"><span className="material-symbols-rounded animate-spin">progress_activity</span> Caricamento...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                        {modals.videoModalRelated.map((v, i) => (
                                            <div key={i} className="flex gap-2 p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 group relative">
                                                <div className="w-28 h-16 bg-black rounded overflow-hidden shrink-0 relative">
                                                    {v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />}
                                                    <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={(e) => { e.stopPropagation(); addToStudio(v, groupName); }} className="bg-black/80 hover:bg-emerald-600 p-0.5 rounded transition-all" title="Aggiungi a Creator Studio"><span className="material-symbols-rounded text-[12px] text-white">edit</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(v.url); }} className="bg-black/80 hover:bg-purple-600 p-0.5 rounded transition-all" title="Copia link"><span className="material-symbols-rounded text-[12px] text-white">link</span></button>
                                                    </div>
                                                </div>
                                                <a href={v.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 block">
                                                    <p className="text-xs text-gray-200 line-clamp-2 group-hover:text-red-400">{v.title}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{v.views} views{v.days_old !== undefined ? ` • ${v.days_old === 0 ? 'Oggi' : v.days_old === 1 ? '1 gg' : v.days_old + ' gg'}` : ''}</p>
                                                </a>
                                            </div>
                                        ))}
                                        {modals.videoModalRelated.length === 0 && !modals.videoModalLoading && <p className="text-xs text-gray-500">Nessun video correlato trovato</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Similar Videos Modal */}
            {modals.similarVideosModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => modals.setSimilarVideosModal(false)}>
                    <div className="bg-slate-900 rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-purple-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-rounded text-purple-400 text-[24px]">video_library</span>
                                <h3 className="text-lg font-bold text-white">Video Simili</h3>
                            </div>
                            <button onClick={() => modals.setSimilarVideosModal(false)} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {modals.similarVideosLoading ? (
                                <div className="flex items-center justify-center py-12 text-gray-500"><span className="material-symbols-rounded animate-spin mr-2">progress_activity</span>Caricamento...</div>
                            ) : modals.similarVideos.length === 0 ? (
                                <div className="text-center py-12 text-gray-500"><span className="material-symbols-rounded text-4xl mb-2">video_library_off</span><p>Nessun video simile trovato</p></div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {modals.similarVideos.map((v, i) => (
                                        <div key={i} className="bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition-colors group">
                                            <div className="relative aspect-video bg-black">
                                                {v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />}
                                                <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-gray-300 flex items-center gap-0.5"><span className="material-symbols-rounded text-[10px]">visibility</span>{v.views}</div>
                                                {v.days_old !== undefined && <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-gray-300">{v.days_old === 0 ? 'Oggi' : v.days_old === 1 ? '1 gg' : v.days_old + ' gg'}</div>}
                                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => addToStudio(v, groupName)} className="bg-black/80 hover:bg-emerald-600 p-1 rounded transition-all" title="Aggiungi a Creator Studio"><span className="material-symbols-rounded text-[14px] text-white">edit</span></button>
                                                    <button onClick={() => copyToClipboard(v.url)} className="bg-black/80 hover:bg-purple-600 p-1 rounded transition-all" title="Copia link"><span className="material-symbols-rounded text-[14px] text-white">link</span></button>
                                                </div>
                                                <a href={v.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-rounded text-white text-[20px]">visibility</span></div></a>
                                            </div>
                                            <div className="p-2"><p className="text-xs text-gray-200 line-clamp-2">{v.title}</p></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
