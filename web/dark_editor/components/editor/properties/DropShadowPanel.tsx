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
      <span className="text-[11px] font-medium text-slate-400 w-16 shrink-0 capitalize">{label}</span>
      <div className="relative flex-1 h-5 flex items-center">
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-slate-800/80" />
        <div className="absolute h-[3px] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
        <div className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-md shadow-black/30 ring-2 ring-violet-400 transition-transform group-hover:scale-110 pointer-events-none"
          style={{ left: `calc(${pct}% - 7px)` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-300 tabular-nums w-10 text-right shrink-0">
        {step < 1 ? value.toFixed(1) : Math.round(value)}{unit || ''}
      </span>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        on ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/40' : 'bg-white/[0.08] ring-1 ring-white/10'
      }`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform mt-1 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
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
      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="text-violet-300/90"><CircleDot className="w-3.5 h-3.5" /></div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Drop Shadow</span>
        </div>
        <Toggle on={!!ds}
          onChange={() => onUpdate('dropShadow', ds ? undefined : { offsetX: 4, offsetY: 4, blur: 12, spread: 0.6, color: '#000000' })} />
      </div>

      <div className={`pt-3 space-y-3 transition-opacity duration-200 ${ds ? '' : 'opacity-40 pointer-events-none'}`}>
        {/* Sliders */}
        <div className="p-3 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.05] space-y-2.5">
          <ShadowSlider label="Offset X" value={ds?.offsetX ?? 0} min={-50} max={50} step={1} unit="px" onChange={(v) => update({ offsetX: v })} />
          <ShadowSlider label="Offset Y" value={ds?.offsetY ?? 0} min={-50} max={50} step={1} unit="px" onChange={(v) => update({ offsetY: v })} />
          <ShadowSlider label="Blur" value={ds?.blur ?? 0} min={0} max={100} step={1} unit="px" onChange={(v) => update({ blur: v })} />
          <ShadowSlider label="Intensity" value={ds?.spread ?? 1} min={0} max={1} step={0.1} onChange={(v) => update({ spread: v })} />
        </div>

        {/* Color Flyout */}
        <div className="p-3 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.05]">
          <div className="relative group">
            <button type="button"
              className="flex items-center justify-between w-full h-9 px-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 cursor-pointer transition-all group-hover:ring-violet-500/40 group-hover:bg-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-md ring-1 ring-white/20 shadow-sm" style={{ backgroundColor: currentColor }} />
                <span className="text-[11px] font-medium text-slate-300 capitalize">Shadow Color</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Flyout: pt-1 bridges the gap so hover persists */}
            <div className="absolute left-0 top-full z-50 hidden w-full pt-1 group-hover:block">
              <div className="p-2.5 bg-[#1a1a1f] border border-white/[0.08] rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-lg ring-1 ring-white/5">
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
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-slate-500">{currentColor.toUpperCase()}</span>
                  <label className="flex items-center gap-1.5 h-6 px-2 rounded-md bg-white/[0.04] ring-1 ring-white/10 cursor-pointer hover:ring-violet-500/40 transition-all relative overflow-hidden">
                    <Pipette className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 pointer-events-none">Custom</span>
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
