"use client"

import { useDriveFileExplorer } from "./hooks/useDriveFileExplorer"
import { DriveFileList } from "./components/DriveFileList"
import { DriveToolbar } from "./components/DriveToolbar"
import type { DriveNode, SelectedItem } from "./types"

interface DriveFileExplorerProps {
  /** ID della cartella iniziale */
  rootFolderId?: string
  /** Titolo del componente */
  title?: string
  /** Modalità: clip (video), stock (immagini), voiceover (audio), all */
  mode?: 'clip' | 'stock' | 'voiceover' | 'all'
  /** Callback quando gli elementi vengono selezionati */
  onSelectionChange?: (items: SelectedItem[]) => void
  /** Callback per confermare la selezione */
  onConfirm?: (items: SelectedItem[]) => void
  /** Abilita animazioni */
  animated?: boolean
  /** Mostra anteprime */
  showThumbnails?: boolean
  /** Abilita selezione multipla */
  multiSelect?: boolean
  /** Filtro tipi file */
  fileFilter?: (file: DriveNode) => boolean
  /** Classi CSS personalizzate */
  className?: string
}

export function DriveFileExplorer({
  rootFolderId,
  title = "Esplora Drive",
  mode = 'all',
  onSelectionChange,
  onConfirm,
  animated = true,
  showThumbnails = true,
  multiSelect = true,
  fileFilter,
  className = "",
}: DriveFileExplorerProps) {
  const {
    rootNodes,
    childrenByFolder,
    expandedIds,
    selectedIds,
    selectedItems,
    loadingFolders,
    loading,
    error,
    activeFileFilter,
    loadFolder,
    handleToggleExpand,
    handleToggleSelect,
    handleRefresh,
    handleClearSelection,
    handleConfirm,
  } = useDriveFileExplorer({
    rootFolderId,
    mode,
    fileFilter,
    onSelectionChange,
    onConfirm,
  })

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <DriveToolbar
        title={title}
        selectedIds={selectedIds}
        selectedCount={selectedItems.size}
        loading={loading}
        onRefresh={handleRefresh}
        onClearSelection={handleClearSelection}
        onConfirm={handleConfirm}
      />

      <div className="flex-1 overflow-auto p-4">
        <DriveFileList
          loading={loading}
          error={error}
          rootNodes={rootNodes}
          animated={animated}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          loadingFolders={loadingFolders}
          childrenByFolder={childrenByFolder}
          showThumbnails={showThumbnails}
          multiSelect={multiSelect}
          activeFileFilter={activeFileFilter}
          onToggleExpand={handleToggleExpand}
          onToggleSelect={handleToggleSelect}
          onLoadChildren={loadFolder}
        />
      </div>

      {/* Footer with selection summary */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              {Array.from(selectedItems.values()).slice(0, 3).map((item, i) => (
                <span key={item.id} className="inline-flex items-center gap-1 mr-2">
                  {i > 0 && <span>•</span>}
                  <span className="truncate max-w-[120px]">{item.name}</span>
                </span>
              ))}
              {selectedItems.size > 3 && (
                <span className="text-slate-500">+{selectedItems.size - 3} altri</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriveFileExplorer