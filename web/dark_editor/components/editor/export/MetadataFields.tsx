'use client';

import React from 'react';
import { Globe, Languages, Tag as TagIcon } from 'lucide-react';
import type { FormState } from './constants';

export interface MetadataFieldsProps {
  form: FormState;
  tagsCount: number;
  onChange: (patch: Partial<FormState>) => void;
}

/**
 * MetadataFields \u2014 the four top metadata inputs of the YouTube
 * publish flow:
 *   - Title (YouTube 100-byte cap, char counter on the right)
 *   - Description (YouTube 5000-byte cap, char counter on the right)
 *   - Tags (free-text comma-separated; orchestrator parses +
 *     enforces the 30-items bound)
 *   - Language pair (default_language + default_audio_language,
 *     BCP-47, 35-byte cap per field)
 *
 * Pure presentational: takes the FormState + a tagsCount (the
 * computed array length from the parent's useMemo over
 * form.tagsInput) + an onChange(patch) handler. The handler
 * patches the form via setForm({...prev, ...patch}) at the
 * parent level so all four fields update through one re-render.
 *
 * The TranslationsList and PrivacySelector are NOT in this file:
 * they live in sibling files because each carries its own
 * array/option logic and would otherwise dominate this file's
 * line count.
 */
export function MetadataFields({
  form,
  tagsCount,
  onChange,
}: MetadataFieldsProps) {
  return (
    <>
      {/* Title */}
      <div>
        <label
          htmlFor="publish-title"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Globe className="h-4 w-4 text-primary" />
          Titolo
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {form.title.length}/100
          </span>
        </label>
        <input
          id="publish-title"
          type="text"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Es. Tutorial completo: come pubblicare un video"
          maxLength={100}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="publish-description"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Globe className="h-4 w-4 text-primary" />
          Descrizione
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {form.description.length}/5000
          </span>
        </label>
        <textarea
          id="publish-description"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Link, credits, riassunto\u2026"
          rows={4}
          maxLength={5000}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Tags */}
      <div>
        <label
          htmlFor="publish-tags"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <TagIcon className="h-4 w-4 text-primary" />
          Tag
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {tagsCount} tag
          </span>
        </label>
        <input
          id="publish-tags"
          type="text"
          value={form.tagsInput}
          onChange={(e) => onChange({ tagsInput: e.target.value })}
          placeholder="news, italia, tutorial (separati da virgola)"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          YouTube accetta fino a 30 tag; il backend rifiuta i payload
          oltre il limite.
        </p>
      </div>

      {/* Language pair */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="publish-default-language"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Languages className="h-4 w-4 text-primary" />
            Lingua principale
          </label>
          <input
            id="publish-default-language"
            type="text"
            value={form.defaultLanguage}
            onChange={(e) => onChange({ defaultLanguage: e.target.value })}
            placeholder="es. it, en, pt-BR"
            maxLength={35}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label
            htmlFor="publish-default-audio"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Languages className="h-4 w-4 text-primary" />
            Lingua audio
          </label>
          <input
            id="publish-default-audio"
            type="text"
            value={form.defaultAudioLanguage}
            onChange={(e) =>
              onChange({ defaultAudioLanguage: e.target.value })
            }
            placeholder="es. it, en"
            maxLength={35}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </>
  );
}

export default MetadataFields;
