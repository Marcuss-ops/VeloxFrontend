import React from 'react';
import { DriveLink } from '../../../utils/driveLinks';

interface DriveLinkFormDialogProps {
    showAddForm: boolean;
    isMasterMode: boolean;
    newLink: { name: string; link: string; parentId: string; language: string };
    isAdding: boolean;
    editingLink: DriveLink | null;
    isUpdating: boolean;
    selectedLink: DriveLink | null;
    links: DriveLink[];
    onNewLinkChange: (field: string, value: string) => void;
    onAddLink: () => void;
    onCancelAdd: () => void;
    onEditingLinkChange: (field: string, value: string) => void;
    onUpdateLink: () => void;
    onCancelEdit: () => void;
    onCloseDetails: () => void;
    onEditLink: (link: DriveLink) => void;
    onAddSubfolder: (parentId: string) => void;
    getChildren: (parentId: string) => DriveLink[];
}

export const DriveLinkFormDialog: React.FC<DriveLinkFormDialogProps> = ({
    showAddForm,
    isMasterMode,
    newLink,
    isAdding,
    editingLink,
    isUpdating,
    selectedLink,
    links,
    onNewLinkChange,
    onAddLink,
    onCancelAdd,
    onEditingLinkChange,
    onUpdateLink,
    onCancelEdit,
    onCloseDetails,
    onEditLink,
    onAddSubfolder,
    getChildren,
}) => {
    // Add form mode
    if (showAddForm) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                        {isMasterMode ? 'Nuovo Master Folder' : 'Nuovo Link'}
                    </h3>
                    <button
                        onClick={onCancelAdd}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className={`mb-4 p-3 rounded-xl ${isMasterMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-sky-500/10 border border-sky-500/20'}`}>
                    <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${isMasterMode ? 'text-emerald-400' : 'text-sky-400'}`}>
                            {isMasterMode ? 'folder_special' : 'link'}
                        </span>
                        <span className={`text-xs font-semibold ${isMasterMode ? 'text-emerald-300' : 'text-sky-300'}`}>
                            {isMasterMode ? 'Cartella Root (Master)' : 'Link/Sottocartella'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                            Nome *
                        </label>
                        <input
                            type="text"
                            value={newLink.name}
                            onChange={(e) => onNewLinkChange('name', e.target.value)}
                            placeholder={isMasterMode ? "Es: VideoYoutube, Stock Master..." : "Es: WWE, HipHop, Discovery..."}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                            Link Drive *
                        </label>
                        <input
                            type="text"
                            value={newLink.link}
                            onChange={(e) => onNewLinkChange('link', e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all"
                        />
                    </div>

                    {!isMasterMode && (
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                                Parent Folder *
                            </label>
                            <select
                                value={newLink.parentId}
                                onChange={(e) => onNewLinkChange('parentId', e.target.value)}
                                className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all cursor-pointer"
                            >
                                <option value="">-- Seleziona Parent --</option>
                                {links.filter(l => !l.parentId).map(link => (
                                    <option key={link.id} value={link.id}>{link.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                            Lingua/Categoria (opzionale)
                        </label>
                        <input
                            type="text"
                            value={newLink.language}
                            onChange={(e) => onNewLinkChange('language', e.target.value)}
                            placeholder="Es: wwe, hiphop, discovery..."
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all"
                        />
                    </div>

                    <button
                        onClick={onAddLink}
                        disabled={isAdding || !newLink.name.trim() || !newLink.link.trim() || (!isMasterMode && !newLink.parentId)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isMasterMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-500 hover:bg-sky-600'}`}
                    >
                        {isAdding ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                Aggiunta...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">{isMasterMode ? 'folder_special' : 'add'}</span>
                                {isMasterMode ? 'Crea Master Folder' : 'Aggiungi Link'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Edit form mode
    if (editingLink) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Modifica Link</h3>
                    <button
                        onClick={onCancelEdit}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                            Nome
                        </label>
                        <input
                            type="text"
                            value={editingLink.name}
                            onChange={(e) => onEditingLinkChange('name', e.target.value)}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                            Link Drive
                        </label>
                        <input
                            type="text"
                            value={editingLink.link}
                            onChange={(e) => onEditingLinkChange('link', e.target.value)}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                            Lingua/Categoria
                        </label>
                        <input
                            type="text"
                            value={editingLink.language || ''}
                            onChange={(e) => onEditingLinkChange('language', e.target.value)}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onUpdateLink}
                            disabled={isUpdating}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all disabled:opacity-50"
                        >
                            {isUpdating ? 'Salvataggio...' : 'Salva'}
                        </button>
                        <button
                            onClick={onCancelEdit}
                            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Detail view mode
    if (selectedLink) {
        const childCount = getChildren(selectedLink.id).length;
        const parentLink = selectedLink.parentId ? links.find(l => l.id === selectedLink.parentId) : null;

        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Dettagli Link</h3>
                    <button
                        onClick={onCloseDetails}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-sky-400 text-2xl">
                                {getChildren(selectedLink.id).length > 0 ? 'folder' : 'link'}
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">{selectedLink.name}</p>
                                {selectedLink.language && (
                                    <span className="text-[10px] font-bold uppercase text-purple-400">
                                        {selectedLink.language}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">ID</p>
                                <p className="text-xs text-slate-300 font-mono truncate">{selectedLink.id}</p>
                            </div>

                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Link</p>
                                <a
                                    href={selectedLink.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-sky-400 hover:text-sky-300 truncate block"
                                >
                                    {selectedLink.link}
                                </a>
                            </div>

                            {parentLink && (
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Parent</p>
                                    <p className="text-xs text-slate-300">
                                        {parentLink.name}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Creato</p>
                                <p className="text-xs text-slate-300">
                                    {new Date(selectedLink.createdAt).toLocaleString('it-IT')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onEditLink(selectedLink)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all text-sm font-semibold"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                            Modifica
                        </button>
                        <button
                            onClick={() => window.open(selectedLink.link, '_blank')}
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
                        onClick={() => onAddSubfolder(selectedLink.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm font-semibold"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Aggiungi Sottocartella
                    </button>
                </div>
            </div>
        );
    }

    // Empty state — no form, no edit, no selection
    return (
        <div className="p-6 flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">link</span>
            <p className="text-sm text-slate-500">Seleziona un link per vedere i dettagli</p>
        </div>
    );
};