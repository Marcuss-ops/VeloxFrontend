import React from 'react';
import { DriveLink } from '../utils/driveLinks';

interface LinkDetailsProps {
    link: DriveLink;
    links: DriveLink[];
    onEdit: (link: DriveLink) => void;
    onAddSubfolder: (parentId: string) => void;
    getChildren: (parentId: string) => DriveLink[];
}

export const LinkDetails: React.FC<LinkDetailsProps> = ({ link, links, onEdit, onAddSubfolder, getChildren }) => {
    const childCount = getChildren(link.id).length;
    const parentLink = link.parentId ? links.find(l => l.id === link.parentId) : null;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Dettagli Link</h3>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="material-symbols-outlined text-sky-400 text-2xl">
                            {getChildren(link.id).length > 0 ? 'folder' : 'link'}
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-white">{link.name}</p>
                            {link.language && (
                                <span className="text-[10px] font-bold uppercase text-purple-400">
                                    {link.language}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">ID</p>
                            <p className="text-xs text-slate-300 font-mono truncate">{link.id}</p>
                        </div>

                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Link</p>
                            <a
                                href={link.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-sky-400 hover:text-sky-300 truncate block"
                            >
                                {link.link}
                            </a>
                        </div>

                        {parentLink && (
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Parent</p>
                                <p className="text-xs text-slate-300">{parentLink.name}</p>
                            </div>
                        )}

                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Creato</p>
                            <p className="text-xs text-slate-300">
                                {new Date(link.createdAt).toLocaleString('it-IT')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(link)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all text-sm font-semibold"
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        Modifica
                    </button>
                    <button
                        onClick={() => window.open(link.link, '_blank')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:bg-sky-500/30 transition-all text-sm font-semibold"
                    >
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                        Apri
                    </button>
                </div>

                {childCount > 0 && (
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-xs text-emerald-300">
                            <span className="font-semibold">{childCount}</span> sottocartelle
                        </p>
                    </div>
                )}

                <button
                    onClick={() => onAddSubfolder(link.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm font-semibold"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Aggiungi Sottocartella
                </button>
            </div>
        </div>
    );
};

export default LinkDetails;
