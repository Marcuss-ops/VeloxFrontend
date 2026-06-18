import React from 'react';
import { DriveLink, NewLinkForm } from '../utils/driveLinks';

interface AddLinkFormProps {
    isMasterMode: boolean;
    newLink: NewLinkForm;
    isAdding: boolean;
    links: DriveLink[];
    onNewLinkChange: (field: keyof NewLinkForm, value: string) => void;
    onAdd: () => void;
    onCancel: () => void;
}

export const AddLinkForm: React.FC<AddLinkFormProps> = ({
    isMasterMode,
    newLink,
    isAdding,
    links,
    onNewLinkChange,
    onAdd,
    onCancel,
}) => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    {isMasterMode ? 'Nuovo Master Folder' : 'Nuovo Link'}
                </h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
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
                    onClick={onAdd}
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
};

export default AddLinkForm;
