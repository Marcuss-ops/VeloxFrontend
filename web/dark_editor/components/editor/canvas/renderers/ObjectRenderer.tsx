'use client';

import type { CanvasObject } from '@/stores/editorStore';
import type { CommonProps, ShadowProps } from './shared';
import { ImageRenderer } from './ImageRenderer';
import { TextRenderer } from './TextRenderer';
import { CircleRenderer, RectRenderer, ShapeRenderer } from './ShapeRenderers';

/**
 * Dispatcher over the CanvasObject union: each kind is rendered by its own
 * typed renderer (the switch is exhaustive over the five union members).
 */
export function ObjectRenderer({
  obj,
  commonProps,
  shadowProps,
  editingId,
  handleTextDblClick,
}: {
  obj: CanvasObject;
  commonProps: CommonProps;
  shadowProps: ShadowProps;
  editingId: string | null;
  handleTextDblClick: any;
}) {
  switch (obj.type) {
    case 'image':
      return <ImageRenderer obj={obj} commonProps={commonProps} shadowProps={shadowProps} />;
    case 'text':
      return (
        <TextRenderer
          obj={obj}
          commonProps={commonProps}
          shadowProps={shadowProps}
          editingId={editingId}
          handleTextDblClick={handleTextDblClick}
        />
      );
    case 'rect':
      return <RectRenderer obj={obj} commonProps={commonProps} shadowProps={shadowProps} />;
    case 'circle':
      return <CircleRenderer obj={obj} commonProps={commonProps} shadowProps={shadowProps} />;
    case 'shape':
      return <ShapeRenderer obj={obj} commonProps={commonProps} shadowProps={shadowProps} />;
  }
}
