const SAVE_EVENT = 'dark_editor_save_requested';

export function requestEditorSave() {
  window.dispatchEvent(new Event(SAVE_EVENT));
}

export function onEditorSaveRequest(handler: () => void) {
  window.addEventListener(SAVE_EVENT, handler);
  return () => window.removeEventListener(SAVE_EVENT, handler);
}

