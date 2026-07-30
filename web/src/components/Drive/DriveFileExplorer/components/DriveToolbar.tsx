"use client"

import { RefreshCw } from "lucide-react"

interface DriveToolbarProps {
  title: string
  selectedIds: Set<string>
  selectedCount: number
  loading: boolean
  onRefresh: () => void
  onClearSelection: () => void
  onConfirm: () => void
}

export function DriveToolbar({
  title,
  selectedIds,
  selectedCount,
  loading,
  onRefresh,
  onClearSelection,
  onConfirm,
}: DriveToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-[11px] text-slate-500">
          {selectedIds.size > 0
            ? `${selectedIds.size} elementi selezionati`
            : "Seleziona file o cartelle"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Aggiorna"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        {selectedIds.size > 0 && (
          <>
            <button
              onClick={onClearSelection}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10"
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-500 font-medium"
            >
              Conferma ({selectedCount})
            </button>
          </>
        )}
      </div>
    </div>
  )
}