'use client';

import React from 'react';
import { CircleDot, ChevronDown, Pipette } from 'lucide-react';
import { useEditorStore, CanvasObject } from '@/stores/editorStore';

function ShadowSlider({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string;
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="flex items-center gap-3 group">
      <span className="w-16 shrink-0 text-[11px] font-medium capitalize text-[#6e6e73]">{label}</span>
      <div className="relative flex-1 h-5 flex items-center">
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-black/10" />
        <div className="absolute h-[3px] rounded-full bg-[#111111]" style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
        <div className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-[#111111] bg-white transition-transform group-hover:scale-110"
          style={{ left: `calc(${pct}% - 7px)` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[#4c4c50]">
        {step < 1 ? value.toFixed(1) : Math.round(value)}{unit || ''}
      </span>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        on ? 'border border-[#111111] bg-[#111111]' : 'border border-black/15 bg-[#e5e5e5]'
      }`}>
      <span className={`mt-0.5 inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const PALETTE_ROWS = [
  ['#000000','#1c1c1e','#2d2d2f','#3a3a3c','#636366','#8e8e93','#aeaeb2','#d1d1d6'],
  ['#ff3b30','#ff9500','#ffcc00','#34c759','#007aff','#5856d6','#af52de','#ff2d55'],
  ['#1e293b','#0f172a','#7c3aed','#2563eb','#0891b2','#059669','#ea580c','#dc2626'],
];

interface DropShadowPanelProps {
  object: CanvasObject;
  onUpdate: (field: keyof CanvasObject, value: unknown) => void;
}

export default function DropShadowPanel({ object, onUpdate }: DropShadowPanelProps) {
  const ds = object.dropShadow;
  const currentColor = ds?.color ?? '#000000';

  const update = (patch: Partial<NonNullable<CanvasObject['dropShadow']>>) => {
    onUpdate('dropShadow', { ...ds!, ...patch });
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between border-b border-black/[0.08] pb-1.5">
        <div className="flex items-center gap-2">
          <div className="text-[#111111]"><CircleDot className="h-3.5 w-3.5" /></div>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#111111]">Drop Shadow</span>
        </div>
        <Toggle on={!!ds}
          onChange={() => onUpdate('dropShadow', ds ? undefined : { offsetX: 4, offsetY: 4, blur: 12, spread: 0.6, color: '#000000' })} />
      </div>

      <div className={`pt-3 space-y-3 transition-opacity duration-200 ${ds ? '' : 'opacity-40 pointer-events-none'}`}>
        {/* Sliders */}
        <div className="space-y-2.5 rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
          <ShadowSlider label="Offset X" value={ds?.offsetX ?? 0} min={-50} max={50} step={1} unit="px" onChange={(v) => update({ offsetX: v })} />
          <ShadowSlider label="Offset Y" value={ds?.offsetY ?? 0} min={-50} max={50} step={1} unit="px" onChange={(v) => update({ offsetY: v })} />
          <ShadowSlider label="Blur" value={ds?.blur ?? 0} min={0} max={100} step={1} unit="px" onChange={(v) => update({ blur: v })} />
          <ShadowSlider label="Intensity" value={ds?.spread ?? 1} min={0} max={1} step={0.1} onChange={(v) => update({ spread: v })} />
        </div>

        {/* Color Flyout */}
        <div className="rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
          <div className="relative group">
            <button type="button"
              className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-black/[0.12] bg-white px-3 transition-all group-hover:border-black/30">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-md border border-black/15" style={{ backgroundColor: currentColor }} />
                <span className="text-[11px] font-medium capitalize text-[#4c4c50]">Shadow Color</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#6e6e73] transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Flyout: pt-1 bridges the gap so hover persists */}
            <div className="absolute left-0 top-full z-50 hidden w-full pt-1 group-hover:block">
              <div className="rounded-xl border border-black/10 bg-white p-2.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-lg border border-black/10">
                  {PALETTE_ROWS.map((row, ri) =>
                    row.map((c) => (
                      <button key={`${ri}-${c}`} onClick={() => update({ color: c })}
                        className={`aspect-square transition-all duration-100 hover:scale-125 hover:z-20 hover:shadow-lg relative ${
                          currentColor === c ? 'z-10 ring-1 ring-inset ring-white scale-110 shadow-lg' : ''
                        }`}
                        style={{ backgroundColor: c }} title={c} />
                    ))
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2">
                  <span className="font-mono text-[10px] text-[#6e6e73]">{currentColor.toUpperCase()}</span>
                  <label className="relative flex h-6 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border border-black/10 bg-[#f7f7f5] px-2 transition-all hover:border-black/30">
                    <Pipette className="h-3 w-3 text-[#6e6e73]" />
                    <span className="pointer-events-none text-[10px] font-medium text-[#6e6e73]">Custom</span>
                    <input className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" type="color" value={currentColor}
                      onChange={(e) => update({ color: e.target.value })} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
