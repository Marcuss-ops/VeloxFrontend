"use client"

import { RefreshCw, X, Check } from "lucide-react"

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
    <div className="flex items-center justify-between px-5 py-3.5 border-b border bg-white/[0.02]">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {selectedIds.size > 0
            ? `${selectedIds.size} elemento${selectedIds.size !== 1 ? 'i' : ''} selezionat${selectedIds.size !== 1 ? 'i' : 'o'}`
            : "Seleziona file o cartelle"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
          title="Aggiorna"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        {selectedIds.size > 0 && (
          <>
            <button
              onClick={onClearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-card/80 text-foreground/70 hover:bg-muted/80 border border transition-all"
            >
              <X className="size-3" />
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98]"
            >
              <Check className="size-3" />
              Conferma ({selectedCount})
            </button>
          </>
        )}
      </div>
    </div>
  )
}