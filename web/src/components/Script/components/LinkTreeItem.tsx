import React from 'react';
import { DriveLink } from '../utils/driveLinks';

interface LinkTreeItemProps {
    link: DriveLink;
    level: number;
    selectedLink: DriveLink | null;
    expandedFolders: Set<string>;
    onSelectLink: (link: DriveLink) => void;
    onToggleFolder: (folderId: string) => void;
    onEditLink: (link: DriveLink) => void;
    onDeleteLink: (linkId: string) => void;
    getChildren: (parentId: string) => DriveLink[];
    renderLinkTree: (parentId: string | null, level: number) => React.ReactNode;
}

export const LinkTreeItem: React.FC<LinkTreeItemProps> = ({
    link,
    level,
    selectedLink,
    expandedFolders,
    onSelectLink,
    onToggleFolder,
    onEditLink,
    onDeleteLink,
    getChildren,
    renderLinkTree,
}) => {
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
                    {renderLinkTree(link.id, level + 1)}
                </div>
            )}
        </div>
    );
};

export default LinkTreeItem;
