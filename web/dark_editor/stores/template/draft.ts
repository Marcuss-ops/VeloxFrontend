import type { StateCreator } from 'zustand';

/**
 * TemplateDraftSlice — small placeholder slice for in-progress template
 * draft work.  Today this is just a single string id; future iterations can
 * extend with `draftMetadata`, `draftVariables`, autosave timestamps, etc.
 *
 * Kept as its own slice (per the [REFACTOR 5/N] plan) so the library slice
 * can remain focused on the canonical `templates` list + the apply/query
 * action surface.
 */

export interface TemplateDraftSlice {
  draftTemplate: string | null;
  setDraft: (id: string | null) => void;
  clearDraft: () => void;
}

import type { TemplateLibrarySlice } from './library';

export type TemplateStoreState = TemplateLibrarySlice & TemplateDraftSlice;

export const createTemplateDraftSlice: StateCreator<
  TemplateStoreState,
  [],
  [],
  TemplateDraftSlice
> = (set) => ({
  draftTemplate: null,
  setDraft: (id) => set({ draftTemplate: id }),
  clearDraft: () => set({ draftTemplate: null }),
});