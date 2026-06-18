import React from 'react';
import { DriveLink } from '../utils/driveLinks';

interface MasterFoldersGridProps {
    links: DriveLink[];
    selectedLink: DriveLink | null;
    onSelectLink: (link: DriveLink) => void;
    onToggleFolder: (folderId: string) => void;
    getChildren: (parentId: string) => DriveLink[];
}

export const MasterFoldersGrid: React.FC<MasterFoldersGridProps> = ({
    links,
    selectedLink,
    onSelectLink,
    onToggleFolder,
    getChildren,
}) => {
    const rootLinks = links.filter(l => !l.parentId);
    if (rootLinks.length === 0) return null;

    return (
        <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <span className="material-symbols-outlined text-emerald-400 text-xl">cloud</span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Master Folders</h3>
                    <p className="text-xs text-slate-500">Cartelle principali del sistema ({rootLinks.length} totali)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rootLinks.map((link) => {
                    const childCount = getChildren(link.id).length;
                    return (
                        <div
                            key={link.id}
                            className={`p-4 bg-slate-950/50 rounded-xl border transition-all cursor-pointer ${
                                selectedLink?.id === link.id
                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                    : 'border-white/5 hover:border-emerald-500/30'
                            }`}
                            onClick={() => {
                                onSelectLink(link);
                                if (childCount > 0) {
                                    onToggleFolder(link.id);
                                }
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-emerald-400">folder_special</span>
                                <span className="text-sm font-semibold text-white truncate">{link.name}</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate font-mono">{link.id.slice(0, 20)}...</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                                {childCount} sottocartelle
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MasterFoldersGrid;
