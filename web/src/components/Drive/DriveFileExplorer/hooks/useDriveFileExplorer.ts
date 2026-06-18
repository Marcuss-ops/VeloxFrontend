"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DriveNode, SelectedItem } from "../DriveFileExplorer"

// Helper inline functions (also available in utils/driveFileExplorer.ts)
const isVideoFile = (f: DriveNode) => {
  const mime = (f.mimeType || '').toLowerCase()
  const name = (f.name || '').toLowerCase()
  return mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg)$/i.test(name)
}

const isImageFile = (f: DriveNode) => {
  const mime = (f.mimeType || '').toLowerCase()
  const name = (f.name || '').toLowerCase()
  return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)
}

const isAudioFile = (f: DriveNode) => {
  const mime = (f.mimeType || '').toLowerCase()
  const name = (f.name || '').toLowerCase()
  return mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(name)
}

export interface UseDriveFileExplorerReturn {
  rootNodes: DriveNode[]
  childrenByFolder: Map<string, DriveNode[]>
  expandedIds: Set<string>
  selectedIds: Set<string>
  selectedItems: Map<string, SelectedItem>
  loadingFolders: Set<string>
  loading: boolean
  error: string | null
  activeFileFilter: (file: DriveNode) => boolean
  loadFolder: (folderId: string) => Promise<DriveNode[]>
  handleToggleExpand: (node: DriveNode) => Promise<void>
  handleToggleSelect: (node: DriveNode, recursive: boolean) => Promise<void>
  handleRefresh: () => Promise<void>
  handleClearSelection: () => void
  handleConfirm: () => void
}

export function useDriveFileExplorer({
  rootFolderId,
  mode = 'all',
  fileFilter,
  onSelectionChange,
  onConfirm,
}: {
  rootFolderId?: string
  mode?: 'clip' | 'stock' | 'voiceover' | 'all'
  fileFilter?: (file: DriveNode) => boolean
  onSelectionChange?: (items: SelectedItem[]) => void
  onConfirm?: (items: SelectedItem[]) => void
}): UseDriveFileExplorerReturn {
  const [rootNodes, setRootNodes] = useState<DriveNode[]>([])
  const [childrenByFolder, setChildrenByFolder] = useState<Map<string, DriveNode[]>>(new Map())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map())
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get API base URL
  const apiBase = useMemo(() => ((window as Window & { API_BASE_URL?: string }).API_BASE_URL || '').toString().trim(), [])

  // Default file filter based on mode
  const defaultFileFilter = useCallback((file: DriveNode) => {
    switch (mode) {
      case 'clip': return isVideoFile(file)
      case 'stock': return isImageFile(file)
      case 'voiceover': return isAudioFile(file)
      default: return true
    }
  }, [mode])

  const activeFileFilter = fileFilter || defaultFileFilter

  // Load folder contents
  const loadFolder = useCallback(async (folderId: string) => {
    setLoadingFolders(prev => new Set(prev).add(folderId))
    setError(null)

    try {
      const res = await fetch(`${apiBase}/api/drive/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: folderId }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Errore ${res.status}`)
      }

      const files: DriveNode[] = Array.isArray(data.files) ? data.files : []

      setChildrenByFolder(prev => {
        const next = new Map(prev)
        next.set(folderId, files)
        return next
      })

      return files
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore caricamento')
      return []
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderId)
        return next
      })
    }
  }, [apiBase])

  // Load root folder on mount
  useEffect(() => {
    if (!rootFolderId) {
      setRootNodes([])
      return
    }

    const loadRoot = async () => {
      setLoading(true)
      setError(null)

      try {
        const files = await loadFolder(rootFolderId)
        setRootNodes(files)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Errore caricamento')
      } finally {
        setLoading(false)
      }
    }

    loadRoot()
  }, [rootFolderId, loadFolder])

  // Handle expand toggle
  const handleToggleExpand = useCallback(async (node: DriveNode) => {
    const isExpanded = expandedIds.has(node.id)

    if (isExpanded) {
      setExpandedIds(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        return next
      })
    } else {
      setExpandedIds(prev => new Set(prev).add(node.id))

      // Load children if not already loaded
      if (!childrenByFolder.has(node.id)) {
        await loadFolder(node.id)
      }
    }
  }, [expandedIds, childrenByFolder, loadFolder])

  // Handle selection toggle
  const handleToggleSelect = useCallback(async (node: DriveNode, recursive: boolean) => {
    const isFolder = node.type === 'folder' || node.mimeType === 'application/vnd.google-apps.folder'

    setSelectedIds(prev => {
      const next = new Set(prev)
      const wasSelected = next.has(node.id)

      if (wasSelected) {
        next.delete(node.id)
      } else {
        next.add(node.id)
      }

      // If recursive and folder, select/deselect all children
      if (recursive && isFolder) {
        const addChildIds = (folderId: string, add: boolean) => {
          const children = childrenByFolder.get(folderId) || []
          for (const child of children) {
            const childIsFolder = child.type === 'folder' || child.mimeType === 'application/vnd.google-apps.folder'

            // Only add files (not folders) when selecting recursively
            if (!childIsFolder) {
              if (activeFileFilter(child)) {
                if (add) {
                  next.add(child.id)
                } else {
                  next.delete(child.id)
                }
              }
            } else {
              // Recurse into subfolders
              addChildIds(child.id, add)
            }
          }
        }

        addChildIds(node.id, !wasSelected)
      }

      return next
    })
  }, [childrenByFolder, activeFileFilter])

  // Update selected items map when selection changes
  useEffect(() => {
    const items = new Map<string, SelectedItem>()

    const processNode = (node: DriveNode) => {
      if (selectedIds.has(node.id)) {
        const isFolder = node.type === 'folder' || node.mimeType === 'application/vnd.google-apps.folder'
        items.set(node.id, {
          id: node.id,
          name: node.name,
          type: isFolder ? 'folder' : 'file',
          url: node.webViewLink || `https://drive.google.com/file/d/${node.id}/view`,
          thumbnailUrl: node.thumbnailLink || `https://drive.google.com/thumbnail?id=${node.id}`,
        })
      }

      // Process children
      const children = childrenByFolder.get(node.id) || []
      for (const child of children) {
        processNode(child)
      }
    }

    for (const node of rootNodes) {
      processNode(node)
    }

    setSelectedItems(items)
    onSelectionChange?.(Array.from(items.values()))
  }, [selectedIds, rootNodes, childrenByFolder, onSelectionChange])

  // Refresh current view
  const handleRefresh = useCallback(async () => {
    if (!rootFolderId) return

    setLoading(true)
    setChildrenByFolder(new Map())
    setExpandedIds(new Set())

    try {
      const files = await loadFolder(rootFolderId)
      setRootNodes(files)
    } finally {
      setLoading(false)
    }
  }, [rootFolderId, loadFolder])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectedItems(new Map())
  }, [])

  // Confirm selection
  const handleConfirm = useCallback(() => {
    onConfirm?.(Array.from(selectedItems.values()))
  }, [selectedItems, onConfirm])

  return {
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
  }
}