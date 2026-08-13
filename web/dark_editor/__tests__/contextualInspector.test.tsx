// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
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

  it('card shows only the controls (no header icon, name or close button)', () => {
    useEditorStore.setState({ objects: [makeImage()], selectedIds: ['img-1'] });
    const { container } = render(
      <ContextualInspector hoveredObjectId={null} dark={false} placement="toolbar" />,
    );
    // The object name must not be rendered as visible text.
    expect(container.textContent).not.toContain('source thumbnail');
    // No close button: the card dismisses itself on pointer leave.
    expect(container.querySelector('button[aria-label="Chiudi controlli"]')).toBeNull();
    // The core controls are the visible content.
    expect(container.querySelector('input[aria-label="Opacità"]')).toBeTruthy();
  });

  it('dismisses itself shortly after the pointer leaves the card', () => {
    vi.useFakeTimers();
    try {
      useEditorStore.setState({ objects: [makeImage()], selectedIds: ['img-1'] });
      const { container } = render(
        <ContextualInspector hoveredObjectId={null} dark={false} placement="toolbar" />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card).toBeTruthy();
      // Entering the card cancels any pending dismiss.
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
      // Re-entering before the grace delay elapses keeps the panel open.
      fireEvent.mouseEnter(card);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(useEditorStore.getState().selectedIds).toEqual(['img-1']);
      // Leaving and waiting past the grace delay clears the selection,
      // which unmounts the card.
      fireEvent.mouseLeave(card);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(useEditorStore.getState().selectedIds).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
