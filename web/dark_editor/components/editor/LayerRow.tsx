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
} from 'lucide-react';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { Input } from '@/components/ui/Input';

function getObjectIcon(type: CanvasObject['type']) {
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
}

interface LayerRowProps {
  obj: CanvasObject;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  onHover?: (id: string | null) => void;
  onRenameStart: () => void;
  onRenameChange: (name: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
}

/**
 * LayerRow — a single layer entry in the Layers panel: type icon, editable
 * name, and the visibility / lock / duplicate / move / delete actions.
 * Extracted from LayersPanel.tsx; reads the store directly for the actions
 * while the rename state stays owned by the panel.
 */
export function LayerRow({
  obj,
  isSelected,
  isEditing,
  editingName,
  onHover,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: LayerRowProps) {
  const {
    selectObject,
    updateObject,
    deleteObject,
    moveLayerUp,
    moveLayerDown,
    duplicateSelected,
  } = useEditorStore();

  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${isSelected ? 'border-black/20 bg-black/[0.07] text-[#111111]' : 'border-black/[0.08] bg-white text-[#6e6e73] hover:border-black/15 hover:bg-black/[0.03] hover:text-[#111111]'}`}
      onClick={() => selectObject(obj.id)}
      onMouseEnter={() => onHover?.(obj.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Icon */}
      <div className={isSelected ? 'text-[#111111]' : 'text-[#9a9a9f]'}>
        {getObjectIcon(obj.type)}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editingName}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit();
              if (e.key === 'Escape') onRenameCancel();
            }}
            className="h-7 rounded-md border-black/15 bg-white text-xs"
            autoFocus
          />
        ) : (
          <p
            className={`truncate text-sm ${isSelected ? 'font-semibold text-[#111111]' : 'text-[#4c4c50]'}`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onRenameStart();
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
}
