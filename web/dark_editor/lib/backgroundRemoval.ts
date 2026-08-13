import { useEditorStore } from '@/stores/editorStore';
import { extractFilenameFromPath, removeBackground } from '@/lib/api';

/**
 * Removes the background of an image object and swaps its `src` with the
 * processed result.
 *
 * Lives OUTSIDE the domain store on purpose: the store only knows about
 * canvas state and never talks to the network. This use-case owns the
 * I/O boundary (the static import of the API client) and feeds the result
 * back into the store through its ordinary updateObject action, so the
 * swap remains undoable via history.
 *
 * The old store action used a dynamic `await import('@/lib/api')`, which
 * coupled the domain layer to the transport layer and broke tree-shaking;
 * the static import here is confined to the application layer.
 */
export async function removeObjectBackground(id: string): Promise<void> {
  const { objects, updateObject } = useEditorStore.getState();
  const obj = objects.find((o) => o.id === id);
  if (!obj || obj.type !== 'image' || !obj.src) return;

  // Set processing state
  updateObject(id, { processing: true });

  try {
    const filename = extractFilenameFromPath(obj.src);

    const response = await removeBackground({ filename, async: false });

    if (response.filename) {
      updateObject(id, { src: response.filename, processing: false });
    } else {
      throw new Error(response.error || 'Failed to remove background');
    }
  } catch (error) {
    console.error('Background removal failed:', error);
    updateObject(id, { processing: false });

    // The caller (dialog/panel) may surface its own toast on the error path.
  }
}
