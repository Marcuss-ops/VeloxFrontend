"use client"

import { Loader2 } from "lucide-react"
import type { DriveNode } from "../types"
import { FolderTreeNode } from "../../components/FolderNode"

interface DriveFileListProps {
  loading: boolean
  error: string | null
  rootNodes: DriveNode[]
  animated: boolean
  selectedIds: Set<string>
  expandedIds: Set<string>
  loadingFolders: Set<string>
  childrenByFolder: Map<string, DriveNode[]>
  showThumbnails: boolean
  multiSelect: boolean
  activeFileFilter: (file: DriveNode) => boolean
  onToggleExpand: (node: DriveNode) => Promise<void>
  onToggleSelect: (node: DriveNode, recursive: boolean) => Promise<void>
  onLoadChildren: (folderId: string) => Promise<DriveNode[]>
}

export function DriveFileList({
  loading,
  error,
  rootNodes,
  animated,
  selectedIds,
  expandedIds,
  loadingFolders,
  childrenByFolder,
  showThumbnails,
  multiSelect,
  activeFileFilter,
  onToggleExpand,
  onToggleSelect,
  onLoadChildren,
}: DriveFileListProps) {
  const folderChildren = rootNodes.filter(
    (n) => n.type === "folder" || n.mimeType === "application/vnd.google-apps.folder"
  )
  const fileChildren = rootNodes.filter(
    (n) => n.type !== "folder" && n.mimeType !== "application/vnd.google-apps.folder"
  )
  const filteredFiles = activeFileFilter ? fileChildren.filter(activeFileFilter) : fileChildren

  if (loading && rootNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-sm">Caricamento...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        {error}
      </div>
    )
  }

  if (rootNodes.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-8">
        Nessun elemento trovato
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Folders */}
      {folderChildren.map((node) => (
        <FolderTreeNode
          key={node.id}
          node={node}
          level={0}
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
          fileFilter={activeFileFilter}
        />
      ))}

      {/* Files at root level */}
      {filteredFiles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 px-3">
            File ({filteredFiles.length})
          </div>
          {filteredFiles.map((file) => (
            <FolderTreeNode
              key={file.id}
              node={file}
              level={0}
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
              fileFilter={activeFileFilter}
            />
          ))}
        </div>
      )}
    </div>
  )
}