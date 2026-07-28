import type { ComponentType } from 'react';
import { Lock, Unlock } from 'lucide-react';

/**
 * Privacy visibility options for the YouTube publish flow.
 * Mirrors the backend's `desired_privacy` field on
 * PublishYouTubeEditorSessionRequest.
 */
export type PrivacyStatus = 'public' | 'unlisted' | 'private';

export interface TranslationRow {
  lang: string;
  title: string;
  description: string;
}

export interface FormState {
  title: string;
  description: string;
  tagsInput: string;
  defaultLanguage: string;
  defaultAudioLanguage: string;
  translations: TranslationRow[];
  privacyStatus: PrivacyStatus;
}

export const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  tagsInput: '',
  defaultLanguage: '',
  defaultAudioLanguage: '',
  translations: [],
  privacyStatus: 'public',
};

/**
 * BCP-47 codes the operator can pick from when adding a new
 * translation row. Used by the ExportDialog's addTranslationRow
 * to seed the new row with the first UNUSED suggestion (so the
 * operator lands on a sensible default instead of an empty input).
 */
export const SUGGESTED_LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];

/**
 * Canonical privacy radio group. Co-located with the FormState
 * type so the icon references are static — no per-render icon
 * allocation. The icon component is referenced by lucide-react
 * (Lock / Unlock); the helper type keeps the public shape
 * framework-agnostic.
 */
export const PRIVACY_OPTIONS: Array<{
  value: PrivacyStatus;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    value: 'public',
    label: 'Pubblico',
    description: 'Visibile a tutti su YouTube.',
    icon: Unlock,
  },
  {
    value: 'unlisted',
    label: 'Non in elenco',
    description: 'Solo chi ha il link può guardarlo.',
    icon: Lock,
  },
  {
    value: 'private',
    label: 'Privato',
    description: 'Solo tu. Necessario se imposti una data di pubblicazione.',
    icon: Lock,
  },
];
