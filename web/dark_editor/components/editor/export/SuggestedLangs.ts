// Suggested translation languages — BCP-47 codes seeded into the
// publish panel's "Aggiungi lingua" picker. Extracted from
// ExportDialog.tsx so the list + the pick-first-unused logic have a
// single source of truth and can be unit-tested in isolation. Future
// i18n expansion only needs to extend SUGGESTED_LANGS.

export const SUGGESTED_LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];

/** First SUGGESTED_LANGS entry not in `usedLangs`, or '' if all used. */
export function pickNextSuggestedLang(usedLangs: string[]): string {
  return SUGGESTED_LANGS.find((l) => !usedLangs.includes(l)) ?? '';
}