'use client';

import React from 'react';
import { useTheme } from '@/components/ui/ThemeProvider';

export interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

/**
 * DockItem — the shared icon button primitive used by every ToolbarDock
 * section (tools, zoom/view, actions). Extracted from ToolbarDock.tsx so the
 * per-section components share one rendering of the hover tooltip + active /
 * disabled states.
 */
export function DockItem({ icon, label, onClick, disabled = false, active = false }: DockItemProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tool-button group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
        active
          ? dark ? 'bg-white text-[#111111] shadow-sm' : 'bg-[#111111] text-white shadow-sm'
          : dark ? 'text-white/65 hover:bg-white/10 hover:text-white' : 'text-black/60 hover:bg-black/[0.06] hover:text-black'
      } ${disabled ? 'opacity-25 cursor-not-allowed' : ''}`}
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="pointer-events-none absolute bottom-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#111111] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">{label}</span>
    </button>
  );
}
