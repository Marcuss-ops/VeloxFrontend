"use client"

import { useState, useCallback, useMemo } from "react"
import { ChevronRight, Folder, File, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import type { DriveNode } from "../DriveFileExplorer/types"
import { isVideoFile, isImageFile, formatFileSize, formatDate } from "../utils/driveFileExplorer"

interface FolderTreeNodeProps {
    node: DriveNode;
    level: number;
    animated: boolean;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onToggleSelect: (node: DriveNode, recursive: boolean) => void;
    onToggleExpand: (node: DriveNode) => void;
    onLoadChildren: (folderId: string) => Promise<DriveNode[]>;
    childrenByFolder: Map<string, DriveNode[]>;
    loadingFolders: Set<string>;
    showThumbnails: boolean;
    multiSelect: boolean;
    fileFilter?: (file: DriveNode) => boolean;
}

export const FolderTreeNode = ({
    node,
    level,
    animated,
    selectedIds,
    expandedIds,
    onToggleSelect,
    onToggleExpand,
    onLoadChildren,
    childrenByFolder,
    loadingFolders,
    showThumbnails,
    multiSelect,
    fileFilter,
}: FolderTreeNodeProps) => {
    const isFolder = node.type === 'folder' || node.mimeType === 'application/vnd.google-apps.folder';
    const isSelected = selectedIds.has(node.id);
    const isExpanded = expandedIds.has(node.id);
    const isLoading = loadingFolders.has(node.id);
    const children = childrenByFolder.get(node.id) || [];
    const hasChildren = children.length > 0 || isFolder;

    const fileChildren = children.filter(c => c.type !== 'folder' && c.mimeType !== 'application/vnd.google-apps.folder');
    const folderChildren = children.filter(c => c.type === 'folder' || c.mimeType === 'application/vnd.google-apps.folder');

    const filteredFiles = fileFilter ? fileChildren.filter(fileFilter) : fileChildren;

    if (!isFolder && fileFilter && !fileFilter(node)) {
        return null;
    }

    return (
        <div className="select-none">
            <div
                className={`
                    group flex items-center gap-3 p-3 my-1.5 rounded-xl
                    bg-slate-900/60 border border-white/10
                    hover:border-violet-500/30 hover:bg-slate-800/60
                    transition-all duration-200 cursor-pointer
                    ${isSelected ? 'border-violet-500/50 bg-violet-500/10' : ''}
                `}
                style={{ marginLeft: `${level * 8}px` }}
            >
                {isFolder && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(node);
                        }}
                        className="p-1 -ml-1 rounded hover:bg-white/5"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 text-slate-400 animate-spin" />
                        ) : animated ? (
                            <motion.span
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                className="flex"
                            >
                                <ChevronRight className="size-4 text-slate-400" />
                            </motion.span>
                        ) : (
                            <ChevronRight
                                className={`size-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            />
                        )}
                    </button>
                )}

                {multiSelect && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(node, true);
                        }}
                        className="flex-shrink-0"
                    >
                        {isSelected ? (
                            <CheckCircle2 className="size-5 text-violet-400 fill-violet-400/20" />
                        ) : (
                            <Circle className="size-5 text-slate-500" />
                        )}
                    </button>
                )}

                {isFolder ? (
                    <Folder className={`size-6 text-sky-400 fill-sky-400/30 ${!hasChildren ? 'ml-5' : ''}`} />
                ) : (
                    <File className="size-6 text-slate-400 ml-5" />
                )}

                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{node.name}</div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        {isFolder ? (
                            <span>{folderChildren.length} cartelle, {filteredFiles.length} file</span>
                        ) : (
                            <>
                                <span>{formatFileSize(node.size)}</span>
                                <span>{formatDate(node.modifiedTime)}</span>
                            </>
                        )}
                    </div>
                </div>

                {isFolder && multiSelect && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(node, true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-[10px] rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30"
                    >
                        Seleziona tutto
                    </button>
                )}
            </div>

            {/* Children */}
            {(() => {
                const content = (
                    <>
                        {folderChildren.map((child) => (
                            <FolderTreeNode
                                key={child.id}
                                node={child}
                                level={level + 1}
                                animated={animated}
                                selectedIds={selectedIds}
                                expandedIds={expandedIds}
                                onToggleSelect={onToggleSelect}
                                onToggleExpand={onToggleExpand}
                                onLoadChildren={onLoadChildren}
                                childrenByFolder={childrenByFolder}
                                loadingFolders={loadingFolders}
                                showThumbnails={showThumbnails}
                                multiSelect={multiSelect}
                                fileFilter={fileFilter}
                            />
                        ))}
                        {filteredFiles.map((file) => (
                            <FileCard
                                key={file.id}
                                file={file}
                                level={level + 1}
                                isSelected={selectedIds.has(file.id)}
                                showThumbnail={showThumbnails}
                                multiSelect={multiSelect}
                                onToggleSelect={() => onToggleSelect(file, false)}
                            />
                        ))}
                    </>
                );

                if (animated) {
                    return (
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                    className="overflow-hidden ml-4 pl-4 border-l border-white/10"
                                >
                                    {content}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    );
                }

                return isExpanded ? (
                    <div className="ml-4 pl-4 border-l border-white/10">
                        {content}
                    </div>
                ) : null;
            })()}
        </div>
    );
};

// File Card Component
interface FileCardProps {
    file: DriveNode;
    level: number;
    isSelected: boolean;
    showThumbnail: boolean;
    multiSelect: boolean;
    onToggleSelect: () => void;
}

export const FileCard = ({
    file,
    level,
    isSelected,
    showThumbnail,
    multiSelect,
    onToggleSelect,
}: FileCardProps) => {
    const isVideo = isVideoFile(file);
    const isImage = isImageFile(file);
    const thumbnailUrl = file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w200`;

    return (
        <div
            className={`
                group flex items-center gap-3 p-2.5 my-1 rounded-xl
                bg-slate-950/50 border border-white/5
                hover:border-white/15 hover:bg-slate-900/50
                transition-all duration-200 cursor-pointer
                ${isSelected ? 'border-violet-500/50 bg-violet-500/10' : ''}
            `}
            style={{ marginLeft: `${level * 8}px` }}
            onClick={multiSelect ? onToggleSelect : undefined}
        >
            {multiSelect && (
                <button onClick={onToggleSelect} className="flex-shrink-0">
                    {isSelected ? (
                        <CheckCircle2 className="size-4 text-violet-400 fill-violet-400/20" />
                    ) : (
                        <Circle className="size-4 text-slate-600" />
                    )}
                </button>
            )}

            {showThumbnail && (isVideo || isImage) && (
                <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black/30 border border-white/10 shrink-0">
                    <img
                        src={thumbnailUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-0 h-0 border-l-4 border-l-white border-y-2 border-y-transparent ml-0.5" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(!showThumbnail || (!isVideo && !isImage)) && (
                <File className="size-5 text-slate-500" />
            )}

            <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-300 truncate">{file.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                    {formatFileSize(file.size)} • {formatDate(file.modifiedTime)}
                </div>
            </div>
        </div>
    );
};
