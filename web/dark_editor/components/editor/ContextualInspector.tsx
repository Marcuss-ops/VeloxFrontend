'use client';

import React, { useEffect, useRef } from 'react';
import { Check, Gauge, Image as ImageIcon, Palette, Sparkles, Type } from 'lucide-react';
import { useEditorStore, type CanvasObject, type CanvasObjectField } from '@/stores/editorStore';

type ContextualInspectorProps = {
  hoveredObjectId: string | null;
  dark?: boolean;
  placement?: 'toolbar' | 'sidebar';
};

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
  onCommit,
  hideLabel = false,
  compact = false,
  className = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  onCommit: () => void;
  hideLabel?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const safeValue = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const percentage = ((safeValue - min) / (max - min)) * 100;
  return (
    <label className={`contextual-control group/slider block min-w-0 overflow-hidden transition-colors ${compact ? 'rounded-md border-0 bg-transparent p-0' : 'rounded-lg border border-black/[0.08] bg-black/[0.025] px-2.5 py-2 hover:border-black/15 hover:bg-black/[0.045] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]'} ${className}`}>
      <span className={`flex items-center gap-2 text-[9px] font-semibold tracking-[0.01em] text-black/55 dark:text-white/60 ${hideLabel ? 'justify-end' : 'justify-between'}`}>
        {!hideLabel && <span className="min-w-0 truncate">{label}</span>}
        <span className="shrink-0 rounded-md bg-black/[0.06] px-1.5 py-0.5 tabular-nums text-black/75 dark:bg-white/10 dark:text-white/80">{Number.isInteger(safeValue) ? safeValue : safeValue.toFixed(1)}{suffix}</span>
      </span>
      <span className={`relative block h-3 ${compact ? 'mt-1' : 'mt-1.5'}`}>
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
          <span className="block h-full rounded-full bg-[#111111] transition-[width] dark:bg-white" style={{ width: `${percentage}%` }} />
        </span>
        <span className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#111111] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform group-hover/slider:scale-110 dark:border-white dark:bg-[#17191f]" style={{ left: `${percentage}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(event) => onChange(Number(event.target.value))}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
    </label>
  );
}

function Group({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5" title={label}>
      <div className="shrink-0 text-black/50 dark:text-white/55">{icon}</div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Divider({ dark }: { dark: boolean }) {
  return <div className={`h-7 w-px shrink-0 ${dark ? 'bg-white/10' : 'bg-black/[0.08]'}`} />;
}

// Smoothly expands/collapses the shadow (or stroke) sub-controls when its
// toggle is pressed, instead of abruptly popping in and out of the strip.
function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center overflow-hidden"
      style={{
        maxWidth: open ? '480px' : '0px',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'max-width 260ms ease, opacity 200ms ease',
      }}
      aria-hidden={!open}
    >
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

function ColorInput({ label, value, onChange, swatchOnly = false, className = '' }: { label: string; value: string; onChange: (value: string) => void; swatchOnly?: boolean; className?: string }) {
  if (swatchOnly) {
    return (
      <label className={`flex size-6 shrink-0 items-center justify-center ${className}`} title={label}>
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
          className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
          aria-label={label}
        />
      </label>
    );
  }
  return (
    <label className={`flex min-h-7 items-center justify-between gap-2 rounded-md border border-black/[0.07] bg-black/[0.02] px-2 dark:border-white/10 dark:bg-white/[0.04] ${className}`} title={label}>
      <span className="truncate text-[8px] font-semibold text-black/50 dark:text-white/55">{label}</span>
      <input
        type="color"
        value={value || '#ffffff'}
        onChange={(event) => onChange(event.target.value)}
        className="h-5 w-5 shrink-0 cursor-pointer rounded border border-black/10 bg-transparent p-0.5 dark:border-white/15"
        aria-label={label}
      />
    </label>
  );
}

function Toggle({ label, on, onChange, compact = false, checkboxOnly = false, className = '' }: { label: string; on: boolean; onChange: () => void; compact?: boolean; checkboxOnly?: boolean; className?: string }) {
  if (compact) {
    if (checkboxOnly) {
      return (
        <button
          type="button"
          onClick={onChange}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md p-0 transition hover:bg-black/[0.06] dark:hover:bg-white/[0.08] ${className}`}
          aria-pressed={on}
          aria-label={label}
          title={label}
        >
          <span className={`flex size-3.5 items-center justify-center rounded-[3px] border ${on ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-black/25 bg-transparent dark:border-white/30'}`}>
            {on && <Check className="size-2.5" strokeWidth={3} />}
          </span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onChange}
        className={`inline-flex min-h-6 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[8px] font-semibold text-black/55 transition hover:bg-black/[0.06] dark:text-white/60 dark:hover:bg-white/[0.08] ${className}`}
        aria-pressed={on}
        title={label}
      >
        <span className={`flex size-3.5 items-center justify-center rounded-[3px] border ${on ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-black/25 bg-transparent dark:border-white/30'}`}>
          {on && <Check className="size-2.5" strokeWidth={3} />}
        </span>
        <span>{label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex min-h-7 w-full items-center justify-between gap-2 rounded-md border px-2 text-[8px] font-semibold transition ${on ? 'border-black/20 bg-black text-white dark:border-white/20 dark:bg-white dark:text-black' : 'border-black/10 bg-black/[0.03] text-black/55 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/[0.08]'} ${className}`}
      aria-pressed={on}
      title={label}
    >
      <span className="flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />{label}</span>
      <span className={`relative h-4 w-7 rounded-full transition-colors ${on ? 'bg-white/25 dark:bg-black/15' : 'bg-black/10 dark:bg-white/10'}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-current transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

function getObjectLabel(object: CanvasObject) {
  if (object.type === 'text') return 'Testo';
  if (object.type === 'image') return 'Immagine';
  if (object.type === 'circle') return 'Cerchio';
  return 'Forma';
}

// How long the card stays visible after the pointer leaves it. A short
// grace delay lets the user move between the strip's tightly-packed
// controls without the panel flickering shut.
const DISMISS_AFTER_LEAVE_MS = 250;

export default function ContextualInspector({ hoveredObjectId, dark = false, placement = 'toolbar' }: ContextualInspectorProps) {
  const { objects, selectedIds, updateObjectLive, updateObject, saveToHistory, clearSelection } = useEditorStore();
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
