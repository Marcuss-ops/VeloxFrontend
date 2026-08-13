'use client';

import React from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Layers,
} from 'lucide-react';
import { useEditorStore, CanvasObject } from '@/stores/editorStore';
import { Input } from '@/components/ui/Input';

export default function LayersPanel({ onLayerHover }: { onLayerHover?: (id: string | null) => void }) {
  const {
    objects,
    selectedIds,
    selectObject,
    updateObject,
    deleteObject,
    moveLayerUp,
    moveLayerDown,
    duplicateSelected,
  } = useEditorStore();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');
  
  const getObjectIcon = (type: CanvasObject['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'rect':
        return <Square className="w-4 h-4" />;
      case 'circle':
        return <Circle className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };
  
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
            {reversedObjects.map((obj, index) => {
              const isSelected = selectedIds.includes(obj.id);
              const realIndex = objects.length - 1 - index;
              
              return (
                <div
                  key={obj.id}
                  className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${isSelected ? 'border-black/20 bg-black/[0.07] text-[#111111]' : 'border-black/[0.08] bg-white text-[#6e6e73] hover:border-black/15 hover:bg-black/[0.03] hover:text-[#111111]'}`}
                  onClick={() => selectObject(obj.id)}
                  onMouseEnter={() => onLayerHover?.(obj.id)}
                  onMouseLeave={() => onLayerHover?.(null)}
                >
                  {/* Icon */}
                  <div className={isSelected ? 'text-[#111111]' : 'text-[#9a9a9f]'}>
                    {getObjectIcon(obj.type)}
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    {editingId === obj.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          updateObject(obj.id, { name: editingName.trim() || obj.name });
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateObject(obj.id, { name: editingName.trim() || obj.name });
                            setEditingId(null);
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        className="h-7 rounded-md border-black/15 bg-white text-xs"
                        autoFocus
                      />
                    ) : (
                      <p
                        className={`truncate text-sm ${isSelected ? 'font-semibold text-[#111111]' : 'text-[#4c4c50]'}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingId(obj.id);
                          setEditingName(obj.name || obj.type);
                        }}
                        title="Double click to rename"
                      >
                        {obj.name || obj.type}
                      </p>
                    )}
                  </div>
                  
                  {/* Visibility toggle */}
                  <button
                    className="rounded-md p-1 opacity-0 transition hover:bg-black/[0.07] group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateObject(obj.id, { visible: !obj.visible });
                    }}
                    title={obj.visible ? 'Hide' : 'Show'}
                  >
                    {obj.visible ? (
                      <Eye className="h-3.5 w-3.5 text-[#6e6e73]" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-[#6e6e73]" />
                    )}
                  </button>

                  <button
                    className="rounded-md p-1 opacity-0 transition hover:bg-black/[0.07] group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateObject(obj.id, { locked: !obj.locked });
                    }}
                    title={obj.locked ? 'Unlock' : 'Lock'}
                  >
                    {obj.locked ? (
                      <Lock className="h-3.5 w-3.5 text-[#6e6e73]" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-[#6e6e73]" />
                    )}
                  </button>

                  <button
                    className="rounded-md p-1 opacity-0 transition hover:bg-black/[0.07] group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectObject(obj.id);
                      duplicateSelected();
                    }}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5 text-[#6e6e73]" />
                  </button>

                  <button
                    className="rounded-md p-1 opacity-0 transition hover:bg-black/[0.07] group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerUp(obj.id);
                    }}
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5 text-[#6e6e73]" />
                  </button>

                  <button
                    className="rounded-md p-1 opacity-0 transition hover:bg-black/[0.07] group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerDown(obj.id);
                    }}
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-[#6e6e73]" />
                  </button>

                  <button
                    className="rounded-md p-1 opacity-0 transition hover:bg-red-50 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteObject(obj.id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
