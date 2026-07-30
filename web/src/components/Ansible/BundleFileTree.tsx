import React from 'react';

// Types
interface BundleFile {
    name: string;
    size: number;
    size_formatted: string;
    compressed: number;
}

// Breadcrumb Component
const Breadcrumb: React.FC<{
    path: string;
    onNavigate: (path: string) => void;
}> = ({ path, onNavigate }) => {
    const parts = path.split('/').filter(Boolean);

    return (
        <div className="flex items-center gap-1 text-sm flex-wrap">
            <button
                onClick={() => onNavigate('')}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            >
                <span className="material-symbols-rounded text-[16px]">home</span>
                <span>root</span>
            </button>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <span className="material-symbols-rounded text-text-muted text-[14px]">chevron_right</span>
                    <button
                        onClick={() => onNavigate(parts.slice(0, index + 1).join('/'))}
                        className="px-2 py-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        {part}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};

// File/Folder Item Component
const FileItem: React.FC<{
    name: string;
    type: 'folder' | 'file';
    size?: number;
    size_formatted?: string;
    file_count?: number;
    onClick?: () => void;
    depth: number;
}> = ({ name, type, size_formatted, file_count, onClick, depth }) => {
    const isFolder = type === 'folder';

    return (
        <div
            className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${isFolder ? 'hover:bg-white/10' : ''}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={isFolder ? onClick : undefined}
        >
            <span className={`material-symbols-rounded text-[20px] ${isFolder ? 'text-amber-400' : 'text-slate-400'}`}>
                {isFolder ? 'folder' : (name.endsWith('.py') ? 'code' : name.endsWith('.txt') ? 'description' : name.endsWith('.json') ? 'data_object' : 'draft')}
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

export interface BundleFileTreeProps {
    currentPath: string;
    currentFiles: { name: string; size: number; size_formatted: string; compressed: number }[];
    filesLoading: boolean;
    onNavigate: (path: string) => void;
    setCurrentPath: (path: string) => void;
}

export const BundleFileTree: React.FC<BundleFileTreeProps> = ({
    currentPath,
    currentFiles,
    filesLoading,
    onNavigate,
    setCurrentPath,
}) => {
    return (
        <div className="bg-card-dark border border-border-dark rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
                <Breadcrumb path={currentPath} onNavigate={onNavigate} />
                {filesLoading && (
                    <span className="material-symbols-rounded text-primary animate-spin text-[20px]">sync</span>
                )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
                {currentFiles.length > 0 ? (
                    currentFiles.map((file, index) => {
                        const isFolder = !file.name.includes('.') || file.name.endsWith('/');
                        return (
                            <FileItem
                                key={index}
                                name={file.name.split('/').pop() || file.name}
                                type={isFolder ? 'folder' : 'file'}
                                size_formatted={file.size_formatted}
                                onClick={() => {
                                    if (isFolder) {
                                        setCurrentPath(file.name.replace(/\/$/, ''));
                                    }
                                }}
                                depth={0}
                            />
                        );
                    })
                ) : (
                    <div className="p-8 text-center text-text-muted">
                        <span className="material-symbols-rounded text-[48px] mb-2">folder_off</span>
                        <p>Nessun file in questa cartella</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BundleFileTree;
