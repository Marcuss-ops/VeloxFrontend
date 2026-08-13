'use client';

import React, { useEffect, useRef } from 'react';
import { Gauge, Image as ImageIcon, Palette, Sparkles, Type } from 'lucide-react';
import { useEditorStore, type CanvasObject, type CanvasObjectField } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import {
  ColorInput,
  Divider,
  Expand,
  getObjectLabel,
  Group,
  Slider,
  Toggle,
} from './ContextualInspectorControls';

type ContextualInspectorProps = {
  hoveredObjectId: string | null;
  dark?: boolean;
  placement?: 'toolbar' | 'sidebar';
};

// How long the card stays visible after the pointer leaves it. A short
// grace delay lets the user move between the strip's tightly-packed
// controls without the panel flickering shut.
const DISMISS_AFTER_LEAVE_MS = 250;

export default function ContextualInspector({ hoveredObjectId: _hoveredObjectId, dark = false, placement = 'toolbar' }: ContextualInspectorProps) {
  const { selectedIds, updateObjectLive, updateObject, saveToHistory, clearSelection } = useEditorStore();
  const objects = useObjectsArray();
  // Dismiss-on-leave: there is no close button anymore — the card hides
  // itself shortly after the pointer leaves it (re-entering cancels the
  // pending dismiss).
  const pointerInsideRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const cancelHide = useRef(() => {
    pointerInsideRef.current = true;
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }).current;

  const scheduleHide = useRef(() => {
    pointerInsideRef.current = false;
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      if (!pointerInsideRef.current) clearSelection();
    }, DISMISS_AFTER_LEAVE_MS);
  }).current;

  const selectedObject = selectedIds.length === 1 ? objects.find((object) => object.id === selectedIds[0]) : null;
  // Selection is the source of truth: clicking an object directly on the
  // canvas must open these controls without requiring a second trip to the
  // Layers panel. The hover id is kept for backwards compatibility with the
  // layer-row hover wiring, but it no longer gates the inspector.
  if (!selectedObject) return null;

  // Any field of any canvas-object kind can be edited through the inspector;
  // widen beyond `keyof CanvasObject` (which only exposes the common keys).
  const updateLive = (field: CanvasObjectField, value: unknown) => updateObjectLive(selectedObject.id, { [field]: value } as Partial<CanvasObject>);
  const update = (field: CanvasObjectField, value: unknown) => updateObject(selectedObject.id, { [field]: value } as Partial<CanvasObject>);
  const setShadow = (enabled: boolean) => {
    if (selectedObject.type === 'text') {
      update('textShadow', enabled ? { offsetX: 2, offsetY: 2, blur: 8, color: '#000000' } : undefined);
    } else {
      update('dropShadow', enabled ? { offsetX: 3, offsetY: 3, blur: 10, spread: 0, color: '#000000' } : undefined);
    }
  };
  const shadow = selectedObject.type === 'text' ? selectedObject.textShadow : selectedObject.dropShadow;
  const updateShadow = (patch: { blur?: number; color?: string; offsetX?: number; offsetY?: number; spread?: number }) => {
    if (selectedObject.type === 'text' && selectedObject.textShadow) {
      update('textShadow', { ...selectedObject.textShadow, ...patch });
    } else if (selectedObject.type !== 'text' && selectedObject.dropShadow) {
      update('dropShadow', { ...selectedObject.dropShadow, ...patch });
    }
  };
  const setTextStroke = (enabled: boolean) => {
    update('textStroke', enabled ? { width: 4, color: '#000000' } : undefined);
  };

  const surface = dark
    ? 'border-white/15 bg-[#17191f]/95 text-white'
    : 'border-black/10 bg-white/[0.97] text-[#111111]';

  return (
    <div
      className={`contextual-inspector z-50 ${
        placement === 'toolbar'
          ? 'absolute bottom-[8.25rem] left-1/2 w-[min(720px,calc(100%-2rem))] -translate-x-1/2'
          : 'relative w-full shrink-0'
      }`}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
      role="toolbar"
      aria-label={`Controlli ${getObjectLabel(selectedObject)}`}
    >
      <div className={`relative overflow-hidden rounded-[18px] border shadow-[0_10px_30px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-xl ${surface}`}>
        {/* Controls strip: single horizontally scrollable row, never wraps */}
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto px-3.5 py-2.5 pr-11">
          <Group icon={<Gauge className="h-3.5 w-3.5" />} label="Opacità">
            <Slider label="Opacità" compact className="w-24 shrink-0" min={0} max={100} value={(selectedObject.opacity ?? 1) * 100} suffix="%" onChange={(value) => updateLive('opacity', value / 100)} onCommit={saveToHistory} />
          </Group>

          {selectedObject.type === 'text' && (
            <>
              <Divider dark={dark} />
              <Group icon={<Type className="h-3.5 w-3.5" />} label="Testo">
                <Slider label="Dimensione" compact className="w-24 shrink-0" min={8} max={300} value={selectedObject.fontSize || 24} onChange={(value) => update('fontSize', value)} onCommit={saveToHistory} />
                <Slider label="Spaziatura" compact className="w-24 shrink-0" min={-10} max={50} value={selectedObject.letterSpacing || 0} onChange={(value) => update('letterSpacing', value)} onCommit={saveToHistory} />
                <ColorInput swatchOnly label="Colore testo" value={selectedObject.fill || '#ffffff'} onChange={(value) => update('fill', value)} />
                <Toggle compact checkboxOnly label="Stroke" on={!!selectedObject.textStroke} onChange={() => setTextStroke(!selectedObject.textStroke)} />
                {selectedObject.textStroke && (
                  <>
                    <ColorInput swatchOnly label="Colore stroke" value={selectedObject.textStroke.color} onChange={(value) => update('textStroke', { ...selectedObject.textStroke!, color: value })} />
                    <Slider label="Spessore" compact className="w-24 shrink-0" min={1} max={40} value={selectedObject.textStroke.width} onChange={(value) => update('textStroke', { ...selectedObject.textStroke!, width: value })} onCommit={saveToHistory} />
                  </>
                )}
                <Toggle compact checkboxOnly label="Ombra" on={!!selectedObject.textShadow} onChange={() => setShadow(!selectedObject.textShadow)} />
                <Expand open={!!selectedObject.textShadow}>
                  <ColorInput swatchOnly label="Colore ombra" value={selectedObject.textShadow?.color || '#000000'} onChange={(value) => updateShadow({ color: value })} />
                  <Slider label="Sfocatura" compact className="w-24 shrink-0" min={0} max={100} value={selectedObject.textShadow?.blur || 0} onChange={(value) => updateShadow({ blur: value })} onCommit={saveToHistory} />
                  <Slider label="Durezza" compact className="w-24 shrink-0" min={0} max={100} value={100 - (selectedObject.textShadow?.blur || 0)} onChange={(value) => updateShadow({ blur: 100 - value })} onCommit={saveToHistory} />
                </Expand>
              </Group>
            </>
          )}

          {(selectedObject.type === 'rect' || selectedObject.type === 'circle') && (
            <>
              <Divider dark={dark} />
              <Group icon={<Palette className="h-3.5 w-3.5" />} label="Forma">
                <ColorInput swatchOnly label="Colore forma" value={selectedObject.fill || '#3b82f6'} onChange={(value) => update('fill', value)} />
                {selectedObject.type === 'rect' && <Slider label="Raggio" compact className="w-24 shrink-0" min={0} max={100} value={selectedObject.borderRadius || 0} onChange={(value) => update('borderRadius', value)} onCommit={saveToHistory} />}
                <ColorInput swatchOnly label="Colore bordo" value={selectedObject.stroke || '#ffffff'} onChange={(value) => update('stroke', value)} />
                <Slider label="Stroke" compact className="w-24 shrink-0" min={0} max={30} value={selectedObject.strokeWidth || 0} onChange={(value) => update('strokeWidth', value)} onCommit={saveToHistory} />
              </Group>
            </>
          )}

          {selectedObject.type === 'image' && (
            <>
              <Divider dark={dark} />
              <Group icon={<ImageIcon className="h-3.5 w-3.5" />} label="Immagine">
                <Slider label="Sfocatura" compact className="w-24 shrink-0" min={0} max={40} value={selectedObject.blur || 0} onChange={(value) => update('blur', value)} onCommit={saveToHistory} />
                <Slider label="Nitidezza" compact className="w-24 shrink-0" min={0} max={100} value={selectedObject.sharpen || 0} onChange={(value) => update('sharpen', value)} onCommit={saveToHistory} />
              </Group>
            </>
          )}

          {selectedObject.type !== 'text' && (
            <>
              <Divider dark={dark} />
              <Group icon={<Sparkles className="h-3.5 w-3.5" />} label="Effetti">
                <Toggle compact checkboxOnly label="Ombra" on={!!shadow} onChange={() => setShadow(!shadow)} />
                <Expand open={!!shadow}>
                  <ColorInput swatchOnly label="Colore ombra" value={shadow?.color || '#000000'} onChange={(value) => updateShadow({ color: value })} />
                  <Slider label="Sfocatura" compact className="w-24 shrink-0" min={0} max={100} value={shadow?.blur || 0} onChange={(value) => updateShadow({ blur: value })} onCommit={saveToHistory} />
                  <Slider label="Durezza" compact className="w-24 shrink-0" min={0} max={100} value={100 - (shadow?.blur || 0)} onChange={(value) => updateShadow({ blur: 100 - value })} onCommit={saveToHistory} />
                </Expand>
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
