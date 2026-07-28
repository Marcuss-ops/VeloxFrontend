'use client';

import React from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import type { TranslationRow } from './constants';

export interface TranslationsListProps {
  translations: TranslationRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<TranslationRow>) => void;
}

/**
 * TranslationsList \u2014 the per-language {title, description} row
 * editor for the YouTube publish flow. Pure presentational: takes
 * the current translations array + add/remove/update callbacks
 * from the parent (ExportDialog owns FormState.translations and
 * the useCallback handlers).
 *
 * Each row carries:
 *   - lang (BCP-47 code; 35-byte cap, mirrors the YouTube bound)
 *   - title (100-byte cap)
 *   - description (5000-byte cap, matches the API bound)
 *
 * The empty-state hint explains the BCP-47 contract; rows use
 * array index as the React key (translations are append/remove
 * only, no reordering) so the input focus stays on the row the
 * operator typed in.
 */
export function TranslationsList({
  translations,
  onAdd,
  onRemove,
  onUpdate,
}: TranslationsListProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4 text-primary" />
          Traduzioni
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi lingua
        </button>
      </div>
      {translations.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Aggiungi righe per localizzare titolo e descrizione. Ogni
          lingua richiede un codice BCP-47 (es. en, pt-BR, fr-CA).
        </p>
      )}
      <div className="mt-3 space-y-3">
        {translations.map((t, idx) => (
          <div
            key={`translation-${idx}`}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={t.lang}
                onChange={(e) => onUpdate(idx, { lang: e.target.value })}
                placeholder="lang (es. en)"
                maxLength={35}
                className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                aria-label={`Rimuovi traduzione ${t.lang || idx + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Rimuovi
              </button>
            </div>
            <input
              type="text"
              value={t.title}
              onChange={(e) => onUpdate(idx, { title: e.target.value })}
              placeholder="Titolo localizzato"
              maxLength={100}
              className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              value={t.description}
              onChange={(e) =>
                onUpdate(idx, { description: e.target.value })
              }
              placeholder="Descrizione localizzata"
              rows={2}
              maxLength={5000}
              className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default TranslationsList;
