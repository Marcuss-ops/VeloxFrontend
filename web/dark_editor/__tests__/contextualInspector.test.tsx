// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import ContextualInspector from '@/components/editor/ContextualInspector';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';

const makeImage = (overrides: Partial<CanvasObject> = {}): CanvasObject => ({
  id: 'img-1',
  type: 'image',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  visible: true,
  locked: false,
  name: 'source thumbnail',
  ...overrides,
});

describe('ContextualInspector shadow expansion', () => {
  beforeEach(() => {
    cleanup();
    useEditorStore.setState({ objects: [], selectedIds: [] });
  });

  it('keeps the shadow controls collapsed until Ombra is pressed, then expands them', () => {
    useEditorStore.setState({ objects: [makeImage()], selectedIds: ['img-1'] });
    const { getByLabelText, container } = render(
      <ContextualInspector hoveredObjectId={null} dark={false} placement="toolbar" />,
    );

    const ombra = getByLabelText('Ombra');
    // The Expand wrapper is the toggle's next sibling.
    const expand = ombra.nextElementSibling as HTMLElement;
    expect(expand).toBeTruthy();
    expect(expand.getAttribute('aria-hidden')).toBe('true');
    expect(expand.style.maxWidth).toBe('0px');
    expect(expand.style.pointerEvents).toBe('none');

    // Press Ombra: shadow becomes active → controls expand.
    fireEvent.click(ombra);
    expect(expand.getAttribute('aria-hidden')).toBe('false');
    expect(expand.style.maxWidth).toBe('480px');
    expect(expand.style.pointerEvents).toBe('auto');

    // The shadow sliders are present once expanded.
    expect(container.querySelector('input[aria-label="Sfocatura"]')).toBeTruthy();
    expect(container.querySelector('input[aria-label="Durezza"]')).toBeTruthy();

    // Press Ombra again: controls collapse elegantly back.
    fireEvent.click(getByLabelText('Ombra'));
    expect(expand.getAttribute('aria-hidden')).toBe('true');
    expect(expand.style.maxWidth).toBe('0px');
  });

  it('header shows only the object icon and the close button (no label or name text)', () => {
    useEditorStore.setState({ objects: [makeImage()], selectedIds: ['img-1'] });
    const { container } = render(
      <ContextualInspector hoveredObjectId={null} dark={false} placement="toolbar" />,
    );
    // The object name must not be rendered as visible text.
    expect(container.textContent).not.toContain('source thumbnail');
    // Close button present.
    expect(container.querySelector('button[aria-label="Chiudi controlli"]')).toBeTruthy();
  });
});
