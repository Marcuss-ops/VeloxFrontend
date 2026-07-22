import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestEditorSave, onEditorSaveRequest } from '@/lib/editorEvents';

describe('editorEvents', () => {
  let listeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    listeners = {};
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn((event: Event) => {
        (listeners[event.type] || []).forEach((listener) => listener(event));
        return true;
      }),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = (listeners[type] || []).filter((l) => l !== listener);
      }),
    } as unknown as Window & typeof globalThis.window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches a save event', () => {
    requestEditorSave();
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    const dispatched = (window.dispatchEvent as ReturnType<typeof vi.fn>).mock.calls[0][0] as Event;
    expect(dispatched.type).toBe('dark_editor_save_requested');
  });

  it('calls the handler when a save event is dispatched', () => {
    const handler = vi.fn();
    onEditorSaveRequest(handler);
    requestEditorSave();
    expect(handler).toHaveBeenCalled();
  });

  it('returns an unsubscribe function', () => {
    const handler = vi.fn();
    const unsubscribe = onEditorSaveRequest(handler);
    unsubscribe();
    expect(window.removeEventListener).toHaveBeenCalledWith('dark_editor_save_requested', handler);
  });
});
