'use client';

import React from 'react';

export function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1.5 border-b border-white/[0.06]">
        <div className="text-violet-300/90">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

export function NumberField({
  label,
  icon,
  value,
  onChange,
  onBlur,
  step,
  suffix,
}: {
  label?: string;
  icon?: string;
  value: number;
  onChange: (val: number) => void;
  onBlur?: () => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</label>}
      <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 focus-within:ring-violet-500/50 focus-within:bg-white/[0.06] transition-all">
        {icon && <span className="text-[10px] font-black text-violet-300/80 select-none w-3.5 text-center">{icon}</span>}
        <input
          className="bg-transparent border-none p-0 text-sm focus:ring-0 w-full text-slate-100 placeholder-slate-600 outline-none tabular-nums"
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onBlur={onBlur}
        />
        {suffix && <span className="text-[10px] font-bold text-slate-500 select-none">{suffix}</span>}
      </div>
    </div>
  );
}

export function ColorSwatch({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const containerHeight = compact ? 'h-9' : 'h-[38px]';
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleTextChange = (val: string) => {
    setInputValue(val);
    if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
      onChange(val);
    }
  };

  const handleTextBlur = () => {
    let formatted = inputValue.trim();
    if (!formatted.startsWith('#')) {
      formatted = '#' + formatted;
    }
    if (/^#[0-9A-F]{6}$/i.test(formatted) || /^#[0-9A-F]{3}$/i.test(formatted)) {
      onChange(formatted);
      setInputValue(formatted);
    } else {
      setInputValue(value);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${containerHeight} w-full rounded-xl bg-white/[0.04] ring-1 ring-white/10 focus-within:ring-violet-500/50 transition-all`}>
      <label className="relative flex items-center justify-center size-6 rounded-md overflow-hidden ml-1.5 cursor-pointer shrink-0 shadow-md transition-transform hover:scale-105 active:scale-95">
        <div
          className="size-full"
          style={{ backgroundColor: value, boxShadow: `0 0 10px ${value}50` }}
        />
        <input
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          type="color"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setInputValue(e.target.value);
          }}
        />
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="#ffffff"
        className="bg-transparent border-none p-0 text-xs font-bold text-slate-200 uppercase w-full outline-none focus:ring-0 select-all tabular-nums"
      />
    </div>
  );
}

export function PropertySlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onBlur,
  suffix = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  onBlur?: () => void;
  suffix?: string;
}) {
  const displayValue = Number.isFinite(value) ? value : 0;
  const percentage = Math.min(100, Math.max(0, ((displayValue - min) / (max - min)) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</label>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={displayValue}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            className="w-12 bg-transparent border-none p-0 text-right text-xs font-bold text-sky-200 focus:ring-0 outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {suffix && <span className="text-[10px] font-bold text-slate-500">{suffix}</span>}
        </div>
      </div>
      
      <div className="relative flex items-center h-5 group cursor-pointer">
        {/* Track Background */}
        <div className="w-full h-1 rounded-full bg-white/[0.08] ring-1 ring-white/5 relative">
          {/* Highlight Fill */}
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full" 
            style={{ width: `${percentage}%` }}
          />
          {/* Visible Slider Circle Knob */}
          <div 
            className="absolute top-1/2 size-3.5 rounded-full bg-white border-2 border-sky-400 shadow-md shadow-sky-500/30 -translate-y-1/2 -translate-x-1/2 transition-transform group-hover:scale-110 active:scale-95" 
            style={{ left: `${percentage}%` }}
          />
        </div>
        
        {/* Invisible Input Range for native dragging interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={onBlur}
          onTouchEnd={onBlur}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

export function RotationDial({
  value,
  onChange,
  onBlur,
}: {
  value: number;
  onChange: (val: number) => void;
  onBlur?: () => void;
}) {
  const dialRef = React.useRef<HTMLDivElement>(null);
  const normalizedValue = ((value % 360) + 360) % 360;

  const handlePointer = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dy = clientY - centerY;
    const dx = clientX - centerX;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;
    onChange(Math.round(angle));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointer(e.clientX, e.clientY);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      handlePointer(moveEvent.clientX, moveEvent.clientY);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (onBlur) onBlur();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      handlePointer(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (onBlur) onBlur();
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl ring-1 ring-white/[0.06]">
      <div className="space-y-1.5 flex-1">
        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Rotation</label>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={Math.round(value)}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            className="w-12 bg-transparent border-none p-0 text-sm font-bold text-sky-200 focus:ring-0 outline-none tabular-nums"
          />
          <span className="text-[10px] font-bold text-slate-500">deg</span>
        </div>
      </div>
      
      <div
        ref={dialRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative size-10 rounded-full border border-white/10 bg-slate-950 flex items-center justify-center cursor-pointer shadow-inner group hover:border-violet-500/50 transition-all select-none shrink-0"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        <div className="size-1 rounded-full bg-slate-500 group-hover:bg-violet-300" />
        <div
          className="absolute inset-0 flex justify-center origin-center transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${normalizedValue}deg)` }}
        >
          <div className="w-0.5 h-3 bg-gradient-to-b from-sky-400 to-cyan-300 rounded-full mt-0.5 group-hover:from-violet-400 group-hover:to-fuchsia-300 shadow-lg shadow-violet-500/50" />
        </div>
      </div>
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        on ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/40' : 'bg-white/[0.08] ring-1 ring-white/10'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform mt-1 ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
