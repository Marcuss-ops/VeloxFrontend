import React from 'react';

interface FileItemProps {
    name: string;
    type: 'folder' | 'file';
    size?: number;
    size_formatted?: string;
    file_count?: number;
    onClick?: () => void;
    depth: number;
}

const getFileIcon = (name: string): string => {
    if (name.endsWith('.py')) return 'code';
    if (name.endsWith('.txt')) return 'description';
    if (name.endsWith('.json')) return 'data_object';
    return 'draft';
};

export const FileItem: React.FC<FileItemProps> = ({ name, type, size_formatted, file_count, onClick, depth }) => {
    const isFolder = type === 'folder';

    return (
        <div
            className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${isFolder ? 'hover:bg-white/10' : ''}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={isFolder ? onClick : undefined}
        >
            <span className={`material-symbols-rounded text-[20px] ${isFolder ? 'text-amber-400' : 'text-slate-400'}`}>
                {isFolder ? 'folder' : getFileIcon(name)}
            </span>
            <div className="flex-1 min-w-0">
                <span className="text-sm text-text-primary truncate">{name}</span>
                {isFolder && file_count && (
                    <span className="text-[10px] text-text-muted ml-2">({file_count} items)</span>
                )}
            </div>
            {size_formatted && (
                <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    {size_formatted}
                </span>
            )}
            {isFolder && (
                <span className="material-symbols-rounded text-text-muted text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    chevron_right
                </span>
            )}
        </div>
    );
};

export default FileItem;
