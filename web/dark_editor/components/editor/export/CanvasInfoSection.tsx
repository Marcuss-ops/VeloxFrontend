'use client';

import React from 'react';
import { FileImage } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';

export function CanvasInfoSection() {
  const { canvasWidth, canvasHeight } = useEditorStore();
  const { currentProject } = useProjectStore();

  return (
    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <FileImage className="h-4 w-4" />
        Canvas: {canvasWidth} × {canvasHeight}px
      </div>
      {currentProject?.name ? (
        <div className="mt-1">Project: {currentProject.name}</div>
      ) : null}
    </div>
  );
}

export default CanvasInfoSection;
