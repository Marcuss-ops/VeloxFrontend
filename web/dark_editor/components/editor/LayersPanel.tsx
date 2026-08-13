'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { LayerRow } from '@/components/editor/LayerRow';

export default function LayersPanel({ onLayerHover }: { onLayerHover?: (id: string | null) => void }) {
  const { selectedIds, updateObject } = useEditorStore();
  const objects = useObjectsArray();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  // Reverse order for display (top layer first)
  const reversedObjects = [...objects].reverse();

  return (
    <div className="flex h-full flex-col bg-white text-[#111111] shadow-[inset_1px_0_0_rgba(0,0,0,0.025)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#111111]" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#111111]">Layers</h3>
        </div>
        <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#6e6e73]">{objects.length}</span>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {reversedObjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-6 text-center text-xs leading-relaxed text-[#6e6e73]">
            No layers yet. Add an image or shape to get started.
          </div>
        ) : (
          <div className="space-y-1.5">
            {reversedObjects.map((obj) => (
              <LayerRow
                key={obj.id}
                obj={obj}
                isSelected={selectedIds.includes(obj.id)}
                isEditing={editingId === obj.id}
                editingName={editingName}
                onHover={onLayerHover}
                onRenameStart={() => {
                  setEditingId(obj.id);
                  setEditingName(obj.name || obj.type);
                }}
                onRenameChange={setEditingName}
                onRenameCommit={() => {
                  updateObject(obj.id, { name: editingName.trim() || obj.name });
                  setEditingId(null);
                }}
                onRenameCancel={() => setEditingId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
