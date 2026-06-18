import React from 'react';
import { DriveLink } from '../../../utils/driveLinks';

interface DriveLinkListProps {
    links: DriveLink[];
    isLoading: boolean;
    selectedLink: DriveLink | null;
    expandedFolders: Set<string>;
    onSelectLink: (link: DriveLink) => void;
    onToggleFolder: (folderId: string) => void;
    onEditLink: (link: DriveLink) => void;
    onDeleteLink: (linkId: string) => void;
    getChildren: (parentId: string) => DriveLink[];
}

const renderLinkTree = (
    parentId: string | null,
    level: number,
    links: DriveLink[],
    selectedLink: DriveLink | null,
    expandedFolders: Set<string>,
    onSelectLink: (link: DriveLink) => void,
    onToggleFolder: (folderId: string) => void,
    onEditLink: (link: DriveLink) => void,
    onDeleteLink: (linkId: string) => void,
    getChildren: (parentId: string) => DriveLink[],
): React.ReactNode => {
    const items = parentId
        ? links.filter(l => l.parentId === parentId)
        : links.filter(l => !l.parentId);

    return items.map(link => {
        const children = getChildren(link.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedFolders.has(link.id);

        return (
            <div key={link.id} className="select-none">
                <div
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                        selectedLink?.id === link.id
                            ? 'bg-sky-500/20 border border-sky-500/30'
                            : 'hover:bg-white/5 border border-transparent'
                    }`}
                    style={{ paddingLeft: `${level * 20 + 12}px` }}
                    onClick={() => onSelectLink(link)}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFolder(link.id);
                            }}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <span className={`material-symbols-outlined text-sm transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                chevron_right
                            </span>
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}

                    <span className={`material-symbols-outlined text-lg ${hasChildren ? 'text-amber-400' : 'text-slate-400'}`}>
                        {hasChildren ? 'folder' : 'link'}
                    </span>

                    <span className="flex-1 text-sm text-slate-200 truncate">{link.name}</span>

                    {link.language && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 rounded-full">
                            {link.language}
                        </span>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(link.link, '_blank');
                            }}
                            className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                            title="Apri in Drive"
                        >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditLink(link);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                            title="Modifica"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLink(link.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Elimina"
                        >
                            <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="animate-fadeIn">
                        {renderLinkTree(link.id, level + 1, links, selectedLink, expandedFolders, onSelectLink, onToggleFolder, onEditLink, onDeleteLink, getChildren)}
                    </div>
                )}
            </div>
        );
    });
};

export const DriveLinkList: React.FC<DriveLinkListProps> = ({
    links,
    isLoading,
    selectedLink,
    expandedFolders,
    onSelectLink,
    onToggleFolder,
    onEditLink,
    onDeleteLink,
    getChildren,
}) => {
    return (
        <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20 backdrop-blur">
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Struttura Link</h3>
                    <span className="text-xs text-slate-500">{links.length} link totali</span>
                </div>
            </div>

            <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="material-symbols-outlined animate-spin text-sky-400">progress_activity</span>
                    </div>
                ) : links.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2">link_off</span>
                        <p className="text-sm">Nessun link presente</p>
                    </div>
                ) : (
                    renderLinkTree(null, 0, links, selectedLink, expandedFolders, onSelectLink, onToggleFolder, onEditLink, onDeleteLink, getChildren)
                )}
            </div>
        </div>
    );
};