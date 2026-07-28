// Helpers shared by the editor store slices and their consumers.
import type { CanvasObject } from '../types';

/**
 * Derive an ordered array of canvas objects from the normalized state shape
 * (`Record<id, CanvasObject>` keyed by id + `objectIds` ordering).
 *
 * This is the canonical projection used by every consumer that needs an
 * ordered list (the timeline shape stays normalized for O(1) lookups).
 */
export function getObjectsArrayFromState(
  objects: Record<string, CanvasObject>,
  objectIds: string[],
): CanvasObject[] {
  return objectIds
    .map((id) => objects[id])
    .filter((obj): obj is CanvasObject => !!obj);
}