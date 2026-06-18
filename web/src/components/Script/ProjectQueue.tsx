import React from 'react';
import { VideoProject } from './types';

interface ProjectQueueProps {
    projects: VideoProject[];
    currentIndex: number;
    onProjectSelect: (index: number) => void;
    onAddProject: () => void;
}

export const ProjectQueue: React.FC<ProjectQueueProps> = ({
    projects,
    currentIndex,
    onProjectSelect,
    onAddProject
}) => {
    return (
        <div className="group/queue relative flex flex-col gap-4 bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-500 rounded-[32px] border border-white/5 hover:border-white/10 p-2 hover:p-6 mb-4">
            {/* COLLAPSED STATE INDICATOR (when not hovering) */}
            <div className="absolute top-1/2 left-4 -translate-y-1/2 flex items-center gap-2 group-hover/queue:hidden opacity-40">
                <span className="material-symbols-outlined text-indigo-400 text-sm">layers</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {projects.length} PROGETTI
                </span>
            </div>

            <div className="hidden group-hover/queue:flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                            <span className="material-symbols-outlined text-indigo-400 text-lg">layers</span>
                        </div>
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl blur opacity-20" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Coda Progetti</h3>
                    </div>
                    <button
                        onClick={onAddProject}
                        className="w-6 h-6 flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-lg transition-all group/btn ml-2 hover:scale-110 active:scale-95"
                        title="Aggiungi Progetto"
                    >
                        <span className="material-symbols-outlined text-[16px] group-hover/btn:rotate-90 transition-transform duration-300">add</span>
                    </button>
                    <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-white/5 ml-auto">
                        {currentIndex + 1} / {projects.length}
                    </span>
                </div>
            </div>

            <div className="hidden group-hover/queue:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {projects.map((proj, index) => (
                    <div key={index} className="relative group/item">
                        <button
                            onClick={() => onProjectSelect(index)}
                            className={`w-full relative flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left shadow-lg hover:scale-[1.02] active:scale-[0.98] ${currentIndex === index
                                ? 'bg-gradient-to-br from-indigo-600/40 to-indigo-600/20 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-indigo-500/10'
                                : 'bg-slate-950/60 border-white/5 hover:border-white/10 hover:bg-slate-900 hover:shadow-white/5'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${currentIndex === index ? 'text-indigo-300' : 'text-slate-600'
                                    }`}>
                                    PROG #{index + 1}
                                </span>
                                {currentIndex === index && (
                                    <span className="material-symbols-outlined text-indigo-400 text-[12px] animate-pulse">check_circle</span>
                                )}
                            </div>
                            <div className="text-[11px] font-bold text-slate-200 truncate pr-2">
                                {proj.titles[0] || 'Nuovo Progetto'}
                            </div>
                        </button>

                        {/* HOVER PREVIEW MODAL/TOOLTIP */}
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover/item:opacity-100 transition-all scale-95 group-hover/item:scale-100 origin-bottom backdrop-blur-xl">
                            <div className="text-[10px] uppercase font-black text-indigo-400 mb-2 tracking-widest border-b border-white/5 pb-2">PREVIEW PROGETTO</div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Titoli ({proj.titles.length})</p>
                                    <div className="space-y-1">
                                        {proj.titles.slice(0, 3).map((t, i) => (
                                            <p key={i} className="text-[10px] text-slate-300 truncate">• {t || 'Senza titolo'}</p>
                                        ))}
                                        {proj.titles.length > 3 && <p className="text-[9px] text-slate-500 italic">...e altri {proj.titles.length - 3}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Stile</p>
                                        <p className="text-[10px] text-slate-300 capitalize">{proj.videoStyle || 'Default'}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Asset</p>
                                        <p className="text-[10px] text-slate-200">{proj.background !== 'Nessuno' ? 'BK' : ''} {proj.music !== 'Nessuno' ? 'MU' : ''}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-white/10 rotate-45 -mt-1.5"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
