'use client';

import React, { useEffect, useRef } from 'react';
import Konva from 'konva';
import type { TextObject } from '@/stores/editorStore';
import { resolveFontFamily } from './shared';

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
