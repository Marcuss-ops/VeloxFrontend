import React, { useState } from 'react';
import { ChevronRight, Folder, FileVideo, Check, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
export interface DriveNode {
    id: string;
    name: string;
    type: 'folder' | 'file';
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
    nodes?: DriveNode[];
    parentId?: string;
    fileCount?: number;  // Numero di file nella cartella
}

interface DriveFileTreeProps {
    nodes: DriveNode[];
    selectedIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
    onFolderExpand?: (folderId: string) => void;
    animated?: boolean;
    showFilePreview?: boolean;
}

// Helper to format file size
const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
};

// Single file/folder item component
interface FilesystemItemProps {
    node: DriveNode;
    selectedIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
    onFolderExpand?: (folderId: string) => void;
    animated?: boolean;
    level?: number;
}

function FilesystemItem({
    node,
    selectedIds,
    onSelectionChange,
    onFolderExpand,
    animated = false,
    level = 0,
}: FilesystemItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isFolder = node.type === 'folder';
    const isSelected = selectedIds.has(node.id);
    const hasChildren = node.nodes && node.nodes.length > 0;
    
    // Count selected items in this folder
    const getSelectedCount = (n: DriveNode): number => {
        if (n.type === 'file') return selectedIds.has(n.id) ? 1 : 0;
        return (n.nodes || []).reduce((acc, child) => acc + getSelectedCount(child), 0);
    };
    
    // Count total files in folder
    const getTotalFileCount = (n: DriveNode): number => {
        if (n.type === 'file') return 1;
        return (n.nodes || []).reduce((acc, child) => acc + getTotalFileCount(child), 0);
    };
    
    const totalCount = isFolder ? (node.fileCount ?? getTotalFileCount(node)) : 0;
    const selectedCount = isFolder ? getSelectedCount(node) : 0;
    const isAllSelected = isFolder && totalCount > 0 && selectedCount === totalCount;
    const isPartialSelected = isFolder && selectedCount > 0 && selectedCount < totalCount;

    const handleToggle = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
            onFolderExpand?.(node.id);
        }
    };

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        
        if (isFolder) {
            // Toggle all files in folder
            const toggleFiles = (n: DriveNode, select: boolean) => {
                if (n.type === 'file') {
                    if (select) newSelected.add(n.id);
                    else newSelected.delete(n.id);
                }
                (n.nodes || []).forEach(child => toggleFiles(child, select));
            };
            
            if (isAllSelected || isPartialSelected) {
                toggleFiles(node, false);
            } else {
                toggleFiles(node, true);
            }
        } else {
            // Toggle single file
            if (isSelected) {
                newSelected.delete(node.id);
            } else {
                newSelected.add(node.id);
            }
        }
        
        onSelectionChange(newSelected);
    };

    const ChevronIcon = () => (
        animated ? (
            <motion.span
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="flex items-center"
            >
                <ChevronRight className="w-4 h-4 text-gray-500" />
            </motion.span>
        ) : (
            <ChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
        )
    );

    const SelectionCheckbox = () => (
        <button
            onClick={handleSelect}
            className={`p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isFolder ? 'mr-1' : 'mr-2'
            }`}
        >
            {isFolder ? (
                isAllSelected ? (
                    <Check className="w-4 h-4 text-violet-500" />
                ) : isPartialSelected ? (
                    <div className="w-4 h-4 border-2 border-violet-500 rounded flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-violet-500 rounded" />
                    </div>
                ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                )
            ) : isSelected ? (
                <Check className="w-4 h-4 text-violet-500" />
            ) : (
                <Square className="w-4 h-4 text-gray-400" />
            )}
        </button>
    );

    const ChildrenList = () => {
        if (!isFolder || !node.nodes) return null;
        
        const children = node.nodes.map((childNode) => (
            <FilesystemItem
                key={childNode.id}
                node={childNode}
                selectedIds={selectedIds}
                onSelectionChange={onSelectionChange}
                onFolderExpand={onFolderExpand}
                animated={animated}
                level={level + 1}
            />
        ));

        if (animated) {
            return (
                <AnimatePresence>
                    {isOpen && (
                        <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="pl-4 overflow-hidden"
                        >
                            {children}
                        </motion.ul>
                    )}
                </AnimatePresence>
            );
        }

        return isOpen ? <ul className="pl-4">{children}</ul> : null;
    };

    return (
        <li className="select-none">
            <div
                className={`flex items-center gap-1 py-2 px-2 rounded-lg transition-colors group
                    ${isSelected || isAllSelected ? 'bg-violet-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}
                `}
            >
                {/* Expand button for folders */}
                {isFolder && hasChildren && (
                    <button
                        onClick={handleToggle}
                        className="p-1 -m-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                        <ChevronIcon />
                    </button>
                )}
                
                {/* Spacer for files or empty folders */}
                {(!isFolder || !hasChildren) && (
                    <div className="w-6" />
                )}
                
                {/* Selection checkbox */}
                <SelectionCheckbox />
                
                {/* Icon - Solo video MP4, colori viola */}
                {isFolder ? (
                    <Folder className="w-5 h-5 text-sky-500 fill-sky-500/20" />
                ) : (
                    <FileVideo className="w-5 h-5 text-violet-500" />
                )}
                
                {/* Name and info */}
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate block">
                        {node.name}
                    </span>
                    {!isFolder && node.size && (
                        <span className="text-xs text-text-muted">
                            {formatFileSize(node.size)}
                        </span>
                    )}
                </div>
                
                {/* File count for folders - sempre visibile */}
                {isFolder && totalCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-text-secondary rounded-full">
                        {totalCount} video{totalCount !== 1 ? 's' : ''}
                    </span>
                )}
                
                {/* Selected count badge for folders */}
                {isFolder && selectedCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-violet-500 text-white rounded-full">
                        {selectedCount} selected
                    </span>
                )}
                
                {/* Video thumbnail preview */}
                {!isFolder && node.thumbnailUrl && (
                    <img
                        src={node.thumbnailUrl}
                        alt={node.name}
                        className="w-12 h-8 object-cover rounded"
                    />
                )}
            </div>
            
            <ChildrenList />
        </li>
    );
}

// Main component
export function DriveFileTree({
    nodes,
    selectedIds,
    onSelectionChange,
    onFolderExpand,
    animated = true,
}: DriveFileTreeProps) {
    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Folder className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-text-secondary">No folders found</p>
                <p className="text-text-muted text-sm">Connect your Google Drive to see files</p>
            </div>
        );
    }

    return (
        <ul className="space-y-1">
            {nodes.map((node) => (
                <FilesystemItem
                    key={node.id}
                    node={node}
                    selectedIds={selectedIds}
                    onSelectionChange={onSelectionChange}
                    onFolderExpand={onFolderExpand}
                    animated={animated}
                />
            ))}
        </ul>
    );
}

export default DriveFileTree;