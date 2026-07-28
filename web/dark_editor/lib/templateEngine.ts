// lib/templateEngine.ts — Dark Editor\'s template-variable substitution engine.
//
// Originally the body of the `applyTemplate` + `batchApplyTemplate` actions
// inside stores/templateStore.ts. They live here now so:
//   1) The substitution logic is testable in isolation (no zustand closure
//      dependency). A future Vitest suite can import `applyTemplate` +
//      `batchApplyTemplate` directly + run headless.
//   2) It can be reused outside the dark editor (e.g., a server-side template
//      preview endpoint, or a CLI gallery tool that renders templates
//      headlessly).
//   3) stores/templateStore.ts becomes a thin facade — the engine owns the
//      Template wire-shape contract (the schema that the persisted localStorage
//      blob has to satisfy), and the store just owns the persisted state +
//      dispatch surface.
//
// Persist-migration guarantee: zero migration. The Template wire shape
// declared here is identical to the original inline declaration in
// templateStore.ts. localStorage entries under the key `dark-editor-templates`
// continue to rehydrate with the same `{ templates: Template[] }` shape — no
// version bump needed.
//
// Public surface (re-exported from the facade stores/templateStore.ts for
// back-compat with any legacy `@/stores/templateStore` consumers that used to
// reach the types through the barrel):
//   - TemplateVariable
//   - TemplateCondition
//   - Template
//   - applyTemplate(template, variables)
//   - batchApplyTemplate(template, dataSets)

import type { CanvasObject } from '../stores/editorStore';

// ------------------------------------------------------------------
// Wire types (moved verbatim from stores/templateStore.ts)
// ------------------------------------------------------------------

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'color' | 'image' | 'number';
  defaultValue: string | number;
  placeholder?: string;
}

export interface TemplateCondition {
  id: string;
  variableId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'complete' | 'text' | 'dynamic';
  objects: CanvasObject[];
  variables?: TemplateVariable[];
  conditions?: TemplateCondition[];
  previewUrl?: string;
  createdAt: number;
  updatedAt: number;
  category?: string;
  tags?: string[];
}

// ------------------------------------------------------------------
// Variable substitution
// ------------------------------------------------------------------

/**
 * Deep-clone a template\'s objects and substitute `{{variableName}}` patterns
 * in `text` and `fill` string fields with the values from `variables`.
 *
 * Pure function — no zustand closure, no side effects, headlessly reusable.
 *
 * Substitution rules:
 *   - Only fields whose runtime type is `string` are scanned (text + fill).
 *   - Numeric and other field types are passed through unchanged.
 *   - Unrecognised `{{key}}` patterns are left intact (no error thrown).
 *   - Multiple occurrences in the same string are all substituted (g flag).
 */
export function applyTemplate(
  template: Template,
  variables: Record<string, string | number> = {}
): CanvasObject[] {
  return template.objects.map(obj => {
    const clonedObj = JSON.parse(JSON.stringify(obj));

    if (clonedObj.text && typeof clonedObj.text === 'string') {
      let text = clonedObj.text;
      Object.entries(variables).forEach(([key, value]) => {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
      clonedObj.text = text;
    }

    if (clonedObj.fill && typeof clonedObj.fill === 'string') {
      let fill = clonedObj.fill;
      Object.entries(variables).forEach(([key, value]) => {
        fill = fill.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
      clonedObj.fill = fill;
    }

    return clonedObj;
  });
}

/**
 * Apply the same template to multiple data sets (e.g., a CSV-driven batch
 * render — each row becomes a CanvasObject[] output). Returns one
 * CanvasObject[] per input data set, in order.
 *
 * Pure function.
 */
export function batchApplyTemplate(
  template: Template,
  dataSets: Record<string, string | number>[]
): CanvasObject[][] {
  return dataSets.map(dataSet => applyTemplate(template, dataSet));
}
