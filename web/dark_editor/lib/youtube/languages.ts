/** Supported language codes for editor preview variants. */
export const LANG_CODES = [
  'it', 'en', 'es', 'fr', 'de', 'ru', 'pt', 'tr',
  'pl', 'ja', 'ko', 'zh', 'ar', 'hi', 'nl',
] as const;

export type LangCode = (typeof LANG_CODES)[number];
