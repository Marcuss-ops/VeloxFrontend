'use client';

import React from 'react';

const labelClass = 'text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e6e73]';
const controlClass = 'rounded-lg border border-black/[0.12] bg-white text-[#111111] outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/[0.08]';

export function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-black/[0.08] pb-5 last:border-b-0">
      <div className="flex items-center gap-2">
        <div className="text-[#111111]">{icon}</div>
        <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#111111]">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
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
      {label && <label className={labelClass}>{label}</label>}
      <div className={`flex h-9 items-center gap-1.5 px-2.5 ${controlClass}`}>
        {icon && <span className="w-3.5 text-center text-[10px] font-black text-[#6e6e73] select-none">{icon}</span>}
        <input
          className="w-full bg-transparent p-0 text-sm tabular-nums text-[#111111] outline-none placeholder:text-[#9a9a9f]"
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onBlur={onBlur}
        />
        {suffix && <span className="select-none text-[10px] font-bold text-[#6e6e73]">{suffix}</span>}
      </div>
    </div>
  );
}

export function ColorSwatch({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleTextChange = (nextValue: string) => {
    setInputValue(nextValue);
    if (/^#[0-9A-F]{6}$/i.test(nextValue) || /^#[0-9A-F]{3}$/i.test(nextValue)) onChange(nextValue);
  };

  const handleTextBlur = () => {
    let formatted = inputValue.trim();
    if (!formatted.startsWith('#')) formatted = `#${formatted}`;
    if (/^#[0-9A-F]{6}$/i.test(formatted) || /^#[0-9A-F]{3}$/i.test(formatted)) {
      onChange(formatted);
      setInputValue(formatted);
    } else {
      setInputValue(value);
    }
  };

  return (
    <div className={`flex w-full items-center gap-2 ${compact ? 'h-9' : 'h-[38px]'} rounded-lg border border-black/[0.12] bg-white px-1.5 transition focus-within:border-black/40 focus-within:ring-2 focus-within:ring-black/[0.08]`}>
      <label className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-md border border-black/10">
        <div className="size-full" style={{ backgroundColor: value }} />
        <input
          className="absolute inset-0 size-full cursor-pointer opacity-0"
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
        className="w-full bg-transparent p-0 text-xs font-bold uppercase tabular-nums text-[#111111] outline-none placeholder:text-[#9a9a9f]"
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={labelClass}>{label}</label>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={displayValue}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            className="w-12 bg-transparent p-0 text-right text-xs font-bold tabular-nums text-[#111111] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {suffix && <span className="text-[10px] font-bold text-[#6e6e73]">{suffix}</span>}
        </div>
      </div>
      <div className="group relative flex h-5 cursor-pointer items-center">
        <div className="relative h-1 w-full rounded-full bg-black/[0.10]">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#111111]" style={{ width: `${percentage}%` }} />
          <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#111111] bg-white transition-transform group-hover:scale-110" style={{ left: `${percentage}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={onBlur}
          onTouchEnd={onBlur}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

export function RotationDial({ value, onChange, onBlur }: { value: number; onChange: (val: number) => void; onBlur?: () => void }) {
  const dialRef = React.useRef<HTMLDivElement>(null);
  const normalizedValue = ((value % 360) + 360) % 360;

  const handlePointer = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const angle = Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2)) * (180 / Math.PI);
    onChange(Math.round((angle + 90 + 360) % 360));
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    handlePointer(event.clientX, event.clientY);
    const handleMouseMove = (moveEvent: MouseEvent) => handlePointer(moveEvent.clientX, moveEvent.clientY);
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onBlur?.();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!event.touches.length) return;
    handlePointer(event.touches[0].clientX, event.touches[0].clientY);
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length) handlePointer(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      onBlur?.();
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
      <div className="space-y-1.5">
        <label className={labelClass}>Rotation</label>
        <div className="flex items-center gap-0.5">
          <input type="number" value={Math.round(value)} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} onBlur={onBlur} className="w-12 bg-transparent p-0 text-sm font-bold tabular-nums text-[#111111] outline-none" />
          <span className="text-[10px] font-bold text-[#6e6e73]">deg</span>
        </div>
      </div>
      <div ref={dialRef} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} className="relative flex size-10 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-black/15 bg-white transition hover:border-black/40">
        <div className="size-1 rounded-full bg-[#6e6e73]" />
        <div className="absolute inset-0 flex origin-center justify-center" style={{ transform: `rotate(${normalizedValue}deg)` }}>
          <div className="mt-1 h-3 w-0.5 rounded-full bg-[#111111]" />
        </div>
      </div>
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${on ? 'border-[#111111] bg-[#111111]' : 'border-black/15 bg-[#e5e5e5]'}`}>
      <span className={`mt-0.5 inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
