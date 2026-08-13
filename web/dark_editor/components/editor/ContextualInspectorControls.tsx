'use client';

import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { CanvasObject } from '@/stores/editorStore';

export function Slider({
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

export function Group({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5" title={label}>
      <div className="shrink-0 text-black/50 dark:text-white/55">{icon}</div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

export function Divider({ dark }: { dark: boolean }) {
  return <div className={`h-7 w-px shrink-0 ${dark ? 'bg-white/10' : 'bg-black/[0.08]'}`} />;
}

// Smoothly expands/collapses the shadow (or stroke) sub-controls when its
// toggle is pressed, instead of abruptly popping in and out of the strip.
export function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
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

export function ColorInput({ label, value, onChange, swatchOnly = false, className = '' }: { label: string; value: string; onChange: (value: string) => void; swatchOnly?: boolean; className?: string }) {
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

export function Toggle({ label, on, onChange, compact = false, checkboxOnly = false, className = '' }: { label: string; on: boolean; onChange: () => void; compact?: boolean; checkboxOnly?: boolean; className?: string }) {
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

export function getObjectLabel(object: CanvasObject) {
  if (object.type === 'text') return 'Testo';
  if (object.type === 'image') return 'Immagine';
  if (object.type === 'circle') return 'Cerchio';
  return 'Forma';
}
