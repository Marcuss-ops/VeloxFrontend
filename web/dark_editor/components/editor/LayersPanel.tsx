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
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { Input } from '@/components/ui/Input';

export default function LayersPanel() {
  const {
    selectedIds,
    selectObject,
    updateObject,
    deleteObject,
    moveLayerUp,
    moveLayerDown,
    duplicateSelected,
  } = useEditorStore();
  const objects = useObjectsArray();

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sidebar-section flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <h3 className="sidebar-section-title">Layers</h3>
        </div>
        <span className="text-xs text-slate-500">{objects.length}</span>
      </div>
      
      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-3">
        {reversedObjects.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
            No layers yet. Add an image or shape to get started.
          </div>
        ) : (
          <div className="space-y-1">
            {reversedObjects.map((obj, index) => {
              const isSelected = selectedIds.includes(obj.id);
              const realIndex = objects.length - 1 - index;
              
              return (
                <div
                  key={obj.id}
                  className={`layer-item group cursor-pointer ${
                    isSelected ? 'active' : ''
                  }`}
                  onClick={() => selectObject(obj.id)}
                >
                  {/* Icon */}
                  <div className={isSelected ? 'text-primary' : 'text-slate-400'}>
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
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <p
                        className={`text-sm truncate ${isSelected ? 'font-semibold text-primary' : 'text-slate-600 dark:text-slate-300'}`}
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateObject(obj.id, { visible: !obj.visible });
                    }}
                    title={obj.visible ? 'Hide' : 'Show'}
                  >
                    {obj.visible ? (
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateObject(obj.id, { locked: !obj.locked });
                    }}
                    title={obj.locked ? 'Unlock' : 'Lock'}
                  >
                    {obj.locked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectObject(obj.id);
                      duplicateSelected();
                    }}
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerUp(obj.id);
                    }}
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerDown(obj.id);
                    }}
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteObject(obj.id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
