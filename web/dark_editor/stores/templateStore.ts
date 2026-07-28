// Backward-compat shim — keeps the legacy `import { ... } from
// '@/stores/templateStore'` surface working.  All new logic lives in the
// per-slice modules under ./template/*; this file is a pure delegation layer.
import type { TemplateStoreState } from './template';

export {
  useTemplateStore,
  templateStore,
  selectAllTemplates,
  selectDraftTemplate,
  type TemplateStoreState,
} from './template';
export type { Template, TemplateVariable, TemplateCondition } from './types';

// Legacy type alias used by some consumers that referenced TemplateStore in
// the pre-refactor API.
export type TemplateStore = TemplateStoreState;