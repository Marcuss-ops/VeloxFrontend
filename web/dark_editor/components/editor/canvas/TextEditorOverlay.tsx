// canvas/TextEditorOverlay.tsx — InstaEditor's textarea overlay for inline
// text editing on the Konva canvas.
//
// Originally part of components/editor/canvas/CanvasRenderers.tsx (816 LOC
// monolith). Extracted here as commit 1 of 6 in the canvas refactor so each
// render-mode overlay lives in its own focused module.
//
// The overlay is a positioned <textarea> that overlays the Konva canvas at
// the screen-space coords of a CanvasObject's text. The user can type new
// text + press Enter (or click away) to save; Escape cancels.
//
// React.memo / Konva preservation:
//   - No React.memo currently wraps this component (matches the original
//     CanvasRenderers.tsx; future memoization is trivial — the prop shape is
//     already pure-data so wrapping with React.memo is a future one-liner).
//   - `stage: Konva.Stage` is part of the prop type per the original
//     signature even though the body doesn't reference it (preserved for
//     back-compat with callers like components/editor/Canvas.tsx).

import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { fontFamilies, type FontKey } from '@/lib/fonts';
import { type TextObject } from '@/stores/editorStore';

// resolveFontFamily is duplicated here (also lives in canvas/ObjectRenderer.tsx)
// — kept inline rather than extracted to a 7th utils.ts file because the user
// specified exactly 6 modules for the canvas refactor and this is a 4-line
// helper. Both copies stay byte-identical to the original at the now-deleted
// CanvasRenderers.tsx header.
function resolveFontFamily(name?: string): string {
  if (!name) return fontFamilies.Arial;
  return fontFamilies[name as FontKey] ?? name;
}

interface TextEditorOverlayProps {
  obj: TextObject;
  stage: Konva.Stage;
  zoom: number;
  offsetX: number;
  offsetY: number;
  onSave: (text: string) => void;
  onClose: () => void;
}

export function TextEditorOverlay({ obj, zoom, offsetX, offsetY, onSave, onClose }: TextEditorOverlayProps) {
  const [text, setText] = React.useState(obj.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const screenPos = {
    x: obj.x * zoom + offsetX,
    y: obj.y * zoom + offsetY,
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenPos.x}px`,
    top: `${screenPos.y}px`,
    minWidth: `${Math.max(obj.width * zoom * (obj.scaleX || 1), 150)}px`,
    minHeight: `${Math.max(obj.height * zoom * (obj.scaleY || 1), 50)}px`,
    width: 'fit-content',
    height: 'fit-content',
    fontSize: `${(obj.fontSize || 24) * zoom * (obj.scaleY || 1)}px`,
    fontFamily: resolveFontFamily(obj.fontFamily),
    color: obj.fill || '#ffffff',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: `${(obj.padding ?? 0) * zoom}px`,
    lineHeight: obj.lineHeight || 1.1,
    zIndex: 100,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(text);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      style={style}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(text)}
    />
  );
}
