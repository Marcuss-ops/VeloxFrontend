// stores/types.ts — Template domain types.
//
// `CanvasObject` now lives in stores/editorStore.ts as the discriminated
// union (ImageObject | TextObject | RectObject | CircleObject | ShapeObject);
// the stale duplicate that used to live here was removed in the P4 cleanup.
// These template types are consumed by stores/template/library.ts and the
// template engine / panels.

import type { CanvasObject } from '@/stores/editorStore';

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'color' | 'number';
  defaultValue: string;
  placeholder?: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'complete' | 'partial';
  objects: CanvasObject[];
  variables: TemplateVariable[];
  createdAt: number;
  updatedAt: number;
  category?: string;
  tags?: string[];
}
