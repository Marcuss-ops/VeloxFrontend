'use client';

import { useCallback, useState } from 'react';

export interface UseEditorHoverReturn {
  hoveredObjectId: string | null;
  handleObjectHover: (id: string | null) => void;
}

/**
 * useEditorHover — owns the hovered canvas object for the contextual
 * inspector. Leaving a layer row keeps the previous id (the user needs
 * time to move from the right sidebar down to the toolbar above
 * Text/Image/Shape/Crop and adjust the selected object there), so the
 * setter only ever moves forward, never clears on mouse-out.
 */
export function useEditorHover(): UseEditorHoverReturn {
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  const handleObjectHover = useCallback((id: string | null) => {
    if (id) setHoveredObjectId(id);
  }, []);

  return { hoveredObjectId, handleObjectHover };
}
