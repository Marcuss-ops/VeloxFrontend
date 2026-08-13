'use client';

import { ToolsSection } from '@/components/editor/toolbar/ToolsSection';
import { ZoomSection } from '@/components/editor/toolbar/ZoomSection';
import { ActionsSection } from '@/components/editor/toolbar/ActionsSection';

// Floating Toolbar Dock Component. It sits below the canvas so the document
// remains the visual focus while tools stay reachable without a side rail.
// The dock is a composition root: tools, zoom/view and actions are rendered
// by the section components under components/editor/toolbar/.
export default function ToolbarDock() {
  return (
    <div className="absolute bottom-16 left-1/2 z-30 max-w-[calc(100vw-2rem)] -translate-x-1/2">
      <div className="editor-toolbar flex max-w-full items-center gap-1.5 overflow-x-auto overflow-y-visible rounded-[18px] border border-black/[0.08] bg-white/[0.96] px-2.5 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-xl dark:border-white/10 dark:bg-[#17191f]/95">
        <ToolsSection />

        <div className="mx-1 h-7 w-px shrink-0 bg-black/[0.08] dark:bg-white/10"></div>

        <ZoomSection />

        <div className="mx-1 h-7 w-px shrink-0 bg-black/[0.08] dark:bg-white/10"></div>

        <ActionsSection />
      </div>
    </div>
  );
}
