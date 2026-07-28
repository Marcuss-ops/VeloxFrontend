import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createTemplateLibrarySlice, type TemplateLibrarySlice } from './library';
import {
  createTemplateDraftSlice,
  type TemplateDraftSlice,
  type TemplateStoreState,
} from './draft';

export type { TemplateStoreState };
export type { TemplateLibrarySlice };
export type { TemplateDraftSlice };

/**
 * Composed template store hook.  Persists `templates` (so user-created
 * templates survive page reloads) + `draftTemplate` (so any in-progress
 * draft state is restored).
 */
export const useTemplateStore = create<TemplateStoreState>()(
  persist(
    (set, get, api) => ({
      ...createTemplateLibrarySlice(set, get, api),
      ...createTemplateDraftSlice(set, get, api),
    }),
    {
      name: 'dark-editor-templates',
      partialize: (state) => ({
        templates: state.templates,
        draftTemplate: state.draftTemplate,
      }),
    },
  ),
);

// Backward-compat alias
export const templateStore = useTemplateStore;

// Selector helpers
export const selectAllTemplates = (s: TemplateStoreState) => s.templates;
export const selectDraftTemplate = (s: TemplateStoreState) => s.draftTemplate;