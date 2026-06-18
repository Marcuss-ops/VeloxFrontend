import React from 'react';
import { DriveLink } from '../utils/driveLinks';

interface EditLinkFormProps {
    editingLink: DriveLink;
    isUpdating: boolean;
    onUpdateField: (field: keyof DriveLink, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const EditLinkForm: React.FC<EditLinkFormProps> = ({
    editingLink,
    isUpdating,
    onUpdateField,
    onSave,
    onCancel,
}) => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Modifica Link</h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
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
                        onChange={(e) => onUpdateField('name', e.target.value)}
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
                        onChange={(e) => onUpdateField('link', e.target.value)}
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
                        onChange={(e) => onUpdateField('language', e.target.value)}
                        className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onSave}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all disabled:opacity-50"
                    >
                        {isUpdating ? 'Salvataggio...' : 'Salva'}
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
                    >
                        Annulla
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditLinkForm;
