/**
 * Info Tab Component
 *
 * Renders the Info tab of the Calendar Modal:
 * Title input, YouTube group selector, script text, and YouTube links.
 */

import React from 'react';
import type { YouTubeGroup, DriveGroup } from './types';

interface InfoTabProps {
    title: string;
    setTitle: (v: string) => void;
    titles: string[];
    setTitles: (fn: (prev: string[]) => string[]) => void;
    youtubeGroup: string;
    youtubeGroups: YouTubeGroup[];
    driveGroups: DriveGroup[];
    loadingGroups: boolean;
    selectedDriveGroup: DriveGroup | null;
    scriptText: string;
    setScriptText: (v: string) => void;
    youtubeLinks: string[];
    setYoutubeLinks: (fn: (prev: string[]) => string[]) => void;
    newYoutubeLink: string;
    setNewYoutubeLink: (v: string) => void;
    voiceoverPaths: string[];
    setVoiceoverPaths: (fn: (prev: string[]) => string[]) => void;
    scriptHistory: string[];
    youtubeHistory: string[];
    showScriptHistory: boolean;
    setShowScriptHistory: (v: boolean) => void;
    showYoutubeHistory: boolean;
    setShowYoutubeHistory: (v: boolean) => void;
    selectedCategory: string;
    setSelectedCategory: (v: string) => void;
    titleSelectionOpen: boolean;
    setTitleSelectionOpen: (v: boolean) => void;
}

export const InfoTab: React.FC<InfoTabProps> = ({
    title, setTitle, titles, setTitles, youtubeGroup,
    youtubeGroups, loadingGroups, selectedDriveGroup,
    scriptText, setScriptText, youtubeLinks, setYoutubeLinks,
    newYoutubeLink, setNewYoutubeLink,
    voiceoverPaths, setVoiceoverPaths,
    scriptHistory, youtubeHistory, showScriptHistory, setShowScriptHistory,
    showYoutubeHistory, setShowYoutubeHistory,
    titleSelectionOpen, setTitleSelectionOpen,
}) => {
    return (
        <>
            {/* Title Input */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <input
                        className="flex-1 bg-transparent border-none text-lg font-bold p-0 focus:ring-0 text-white placeholder:text-white/20 focus:outline-none"
                        placeholder="Enter project title..."
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <button
                        onClick={() => setTitleSelectionOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shrink-0"
                        title="Seleziona titolo da categoria"
                    >
                        <span className="material-symbols-outlined text-sm">category</span>
                        Scegli Titolo
                    </button>
                </div>
            </div>

            {/* Title Tags */}
            {titles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {titles.map((t, idx) => (
                        <div key={idx} className="group flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 font-medium">
                            <input
                                type="text"
                                value={t}
                                onChange={(e) => {
                                    const newTitles = [...titles];
                                    newTitles[idx] = e.target.value;
                                    setTitles(() => newTitles);
                                }}
                                className="bg-transparent border-none outline-none focus:ring-0 text-amber-200 text-xs w-auto min-w-[50px]"
                                size={Math.max(t.length, 5)}
                            />
                            <button onClick={() => setTitles(prev => prev.filter((_, i) => i !== idx))} className="text-amber-500/50 hover:text-red-400 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Social Group Selector */}
            <section className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Social Group
                    </h3>
                    {selectedDriveGroup && (
                        <span className="text-[9px] bg-green-500/20 px-2 py-1 rounded text-green-300">
                            Drive: {selectedDriveGroup.display}
                        </span>
                    )}
                </div>

                {loadingGroups ? (
                    <div className="flex items-center justify-center py-4">
                        <span className="material-symbols-outlined text-white/30 animate-spin">sync</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {youtubeGroups.map(group => (
                            <button
                                key={group.name}
                                onClick={() => {}}
                                className={`p-2 rounded-lg border transition-all ${
                                    youtubeGroup === group.name ? 'bg-purple-500/30 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                }`}
                            >
                                <div className="text-[10px] font-bold truncate">{group.name}</div>
                                <div className="text-[8px] text-white/40">{group.channels?.length || 0} ch</div>
                            </button>
                        ))}
                    </div>
                )}

                {youtubeGroup && selectedDriveGroup && (
                    <div className="mt-3 p-2 bg-black/30 rounded-lg text-[10px] text-white/50">
                        <div className="flex gap-4">
                            {selectedDriveGroup.stock && (
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full"></span>Stock: {selectedDriveGroup.stock.name}</span>
                            )}
                            {selectedDriveGroup.clip && (
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span>Clips: {selectedDriveGroup.clip.name}</span>
                            )}
                            {selectedDriveGroup.voiceover && (
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>Voiceover: {selectedDriveGroup.voiceover.name}</span>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* Script Text Section */}
            <section className="p-4 bg-white/5 rounded-xl border border-white/10 relative">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">description</span>
                        Script / Note
                    </h3>
                    <div className="flex items-center gap-2">
                        {scriptHistory.length > 0 && (
                            <div className="relative">
                                <button onClick={() => setShowScriptHistory(!showScriptHistory)} className="text-[9px] bg-green-500/20 hover:bg-green-500/30 text-green-300 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">history</span>Storico
                                </button>
                                {showScriptHistory && (
                                    <div className="absolute top-full right-0 mt-1 w-72 max-h-48 overflow-y-auto bg-slate-900 border border-white/10 rounded-lg shadow-xl z-50">
                                        {scriptHistory.map((item, idx) => (
                                            <button key={idx} onClick={() => { setScriptText(item); setShowScriptHistory(false); }} className="w-full text-left px-3 py-2 text-[10px] text-white/70 hover:bg-white/10 truncate border-b border-white/5 last:border-0">
                                                {item.slice(0, 80)}...
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <span className="text-[9px] text-white/40">{scriptText.length} caratteri</span>
                    </div>
                </div>

                <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="Inserisci lo script o le note per il video..."
                    rows={10}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-green-500/40 outline-none resize-none transition-all hover:border-white/20"
                />
            </section>

            {/* YouTube Links Section */}
            <section className="p-4 bg-white/5 rounded-xl border border-white/10 relative">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Source Link
                    </h3>
                    <div className="flex items-center gap-2">
                        {youtubeHistory.length > 0 && (
                            <div className="relative">
                                <button onClick={() => setShowYoutubeHistory(!showYoutubeHistory)} className="text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">history</span>Storico
                                </button>
                                {showYoutubeHistory && (
                                    <div className="absolute top-full right-0 mt-1 w-72 max-h-48 overflow-y-auto bg-slate-900 border border-white/10 rounded-lg shadow-xl z-50">
                                        {youtubeHistory.map((item, idx) => (
                                            <button key={idx} onClick={() => { setShowYoutubeHistory(false); }} className="w-full text-left px-3 py-2 text-[10px] text-white/70 hover:bg-white/10 truncate border-b border-white/5 last:border-0">
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <span className="text-[9px] bg-red-500/20 px-2 py-1 rounded text-red-300">{youtubeLinks.length} link</span>
                    </div>
                </div>

                {/* Add new link */}
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newYoutubeLink}
                        onChange={(e) => setNewYoutubeLink(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:ring-1 focus:ring-red-500/40 outline-none"
                    />
                    <button
                        onClick={() => { if (newYoutubeLink.trim()) { setYoutubeLinks(prev => [...prev, newYoutubeLink.trim()]); setNewYoutubeLink(''); } }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold transition-colors"
                    >
                        Aggiungi
                    </button>
                </div>

                {/* Links list */}
                {youtubeLinks.length > 0 && (
                    <div className="space-y-2">
                        {youtubeLinks.map((link, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                                <span className="material-symbols-outlined text-red-400 text-sm">link</span>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 text-[11px] text-blue-400 hover:text-blue-300 truncate">{link}</a>
                                <button onClick={() => setYoutubeLinks(prev => prev.filter((_, i) => i !== idx))} className="text-white/30 hover:text-red-400 transition-colors">
                                    <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Voiceover Paths Section */}
            <section className="p-4 bg-white/5 rounded-xl border border-white/10 relative">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">mic</span>
                        Voiceover Paths
                    </h3>
                    <span className="text-[9px] bg-orange-500/20 px-2 py-1 rounded text-orange-300">{voiceoverPaths.length} paths</span>
                </div>

                <textarea
                    value={voiceoverPaths.join('\n')}
                    onChange={(e) => {
                        const next = e.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean);
                        setVoiceoverPaths(() => next);
                    }}
                    placeholder="Una riga per path/audio URL"
                    rows={4}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-orange-500/40 outline-none resize-none transition-all hover:border-white/20"
                />
                <p className="mt-2 text-[10px] text-white/40">
                    Inserisci path o URL audio. Almeno uno serve per mettere il video in coda.
                </p>
            </section>
        </>
    );
};
