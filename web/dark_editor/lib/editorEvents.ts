const SAVE_EVENT = 'dark_editor_save_requested';

type EditorFlushHandler = () => void | Promise<void>;
const flushHandlers = new Set<EditorFlushHandler>();

export function requestEditorSave() {
  window.dispatchEvent(new Event(SAVE_EVENT));
}

export function onEditorSaveRequest(handler: () => void) {
  window.addEventListener(SAVE_EVENT, handler);
  return () => window.removeEventListener(SAVE_EVENT, handler);
}

/** Wait until editor mutations/autosave work has settled before reading the canvas. */
export async function requestEditorFlush(): Promise<void> {
  await Promise.all([...flushHandlers].map((handler) => Promise.resolve().then(handler)));
}

export function onEditorFlushRequest(handler: EditorFlushHandler) {
  flushHandlers.add(handler);
  return () => {
    flushHandlers.delete(handler);
  };
}
