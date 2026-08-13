import React from 'react';
import { ChevronRight, Home, RefreshCw } from 'lucide-react';

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
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
                <Home className="size-4" />
                <span>root</span>
            </button>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                    <button
                        onClick={() => onNavigate(parts.slice(0, index + 1).join('/'))}
                        className="px-2 py-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
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
            <span className={`material-symbols-rounded text-[20px] ${isFolder ? 'text-amber-400' : 'text-muted-foreground'}`}>
                {isFolder ? 'folder' : (name.endsWith('.py') ? 'code' : name.endsWith('.txt') ? 'description' : name.endsWith('.json') ? 'data_object' : 'draft')}
            </span>
            <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground truncate">{name}</span>
                {isFolder && file_count && (
                    <span className="text-[10px] text-muted-foreground ml-2">({file_count} items)</span>
                )}
            </div>
            {size_formatted && (
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {size_formatted}
                </span>
            )}
            {isFolder && (
                <ChevronRight className="size-4 " />
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
        <div className="bg-card border border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border flex items-center justify-between">
                <Breadcrumb path={currentPath} onNavigate={onNavigate} />
                {filesLoading && (
                    <RefreshCw className="size-4 animate-spin" />
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
                    <div className="p-8 text-center text-muted-foreground">
                        <span className="material-symbols-rounded text-[48px] mb-2">folder_off</span>
                        <p>Nessun file in questa cartella</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BundleFileTree;
