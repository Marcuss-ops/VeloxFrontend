// ------------------------------------------------------------------
// Suggested translation languages — BCP-47 code list used by the
// dark editor's publish panel to seed the "Add translation" picker.
//
// Lives in components/editor/export/SuggestedLangs.ts (commit 1 of 5
// of the ExportDialog.tsx sub-module extraction series). Extracted
// from ExportDialog.tsx so the array + the "pick first unused
// suggestion" helper logic have a single source of truth and can be
// unit-tested without rendering the 800-LOC dialog component.
//
// Future i18n coverage expansion (e.g. Japanese, Korean, Arabic) only
// needs to extend this single list — the parent dialog's translation
// add-row button automatically picks the next unused suggestion.
// ------------------------------------------------------------------

/**
 * SUGGESTED_LANGS — ordered list of BCP-47 language codes that the
 * publish dialog offers by default when the operator clicks
 * "Aggiungi lingua". Order matters: the first unused code becomes
 * the default `lang` for the new translation row.
 */
export const SUGGESTED_LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];

/**
 * pickNextSuggestedLang — given the set of language codes already
 * present in the form's translations array, return the first
 * suggestion not yet used. Returns `''` when every suggestion is
 * already in use (caller falls back to an empty textbox).
 *
 * Pure function — extracted from ExportDialog.tsx's addTranslationRow
 * callback so the "pick first unused" logic can be tested in isolation
 * without mounting React + the full publish panel.
 */
export function pickNextSuggestedLang(usedLangs: readonly string[]): string {
  return SUGGESTED_LANGS.find((l) => !usedLangs.includes(l)) ?? '';
}