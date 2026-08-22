'use client';

import React from 'react';
import LayersPanel from '@/components/editor/LayersPanel';
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  type UseEditorSidebarReturn,
} from '@/hooks/useEditorSidebar';

type EditorSidebarProps = {
  sidebar: UseEditorSidebarReturn;
  isDarkTheme: boolean;
  onLayerHover: (id: string | null) => void;
};

/**
 * Right-hand hoverable sidebar: the resize handle + Layers panel surface.
 * Owns no behavior — it forwards the sidebar hook's callbacks and renders
 * the presentational shell.
 */
export default function EditorSidebar({ sidebar, isDarkTheme, onLayerHover }: EditorSidebarProps) {
  return (
    <aside
      onMouseEnter={sidebar.handleSidebarEnter}
      onMouseLeave={sidebar.handleSidebarLeave}
      className={`sidebar-shell fixed bottom-0 right-0 top-0 z-30 flex flex-col transition-transform duration-300 ease-out ${sidebar.isSidebarVisible ? 'translate-x-0' : 'translate-x-[calc(100%-28px)]'}`}
      style={{ width: sidebar.sidebarWidth } as React.CSSProperties}
    >
      {/* Trigger handle bar on the left edge of the sidebar */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 flex w-[28px] cursor-col-resize items-center justify-center border-r border-black/10 bg-black/5"
        role="separator"
        aria-label="Ridimensiona sidebar"
        aria-orientation="vertical"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={sidebar.sidebarWidth}
        tabIndex={0}
        onPointerDown={sidebar.handleSidebarResizeStart}
        onKeyDown={sidebar.handleSidebarResizeKeyDown}
        onDoubleClick={() => sidebar.updateSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
        title="Trascina per ridimensionare · doppio clic per ripristinare"
      >
        <div className="w-1 h-12 rounded-full bg-black/20"></div>
      </div>
      <div className={`editor-sidebar-surface pl-[28px] flex flex-col h-full border-l shadow-[-10px_0_28px_rgba(0,0,0,0.08),inset_1px_0_0_rgba(0,0,0,0.03)] ${isDarkTheme ? 'bg-[#17191f] text-white border-white/10' : 'bg-white text-[#171717] border-black/[0.10]'}`} onClick={sidebar.handleSidebarEnter}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <LayersPanel onLayerHover={onLayerHover} />
          </div>
        </div>
      </div>
    </aside>
  );
}
