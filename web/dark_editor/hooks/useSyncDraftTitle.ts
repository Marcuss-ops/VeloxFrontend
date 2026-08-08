'use client';

import { useEffect, useRef } from 'react';
import { saveEditorSessionDraft } from '@/lib/api/bff';

export interface SyncDraftTitleOptions {
  /** Debounce window in ms before the title PUT fires. Defaults to 800. */
  debounceMs?: number;
}

/**
 * useSyncDraftTitle — keeps the InstaEdit draft_title in lock-step with
 * the editor's rename pill for InstaEdit-backed sessions (ve_*).
 *
 * Background: the pill rename only writes the project name to the editor's
 * local projects.json. The Copertine hub card renders `draft_title || name`
 * from the InstaEdit DB, so a rename performed inside the editor never
 * reached the card ("mi torna ancora con Rap-Vortex-15"). This hook fires a
 * PARTIAL PUT /draft with `{ title }` only — the backend merges it against
 * the operator's description/tags/privacy without clobbering them.
 *
 * Debounced: renames happen keystroke-by-keystroke; we wait for a pause
 * before paying the network round-trip. Only InstaEdit-backed sessions
 * (projectId starts with `ve_`) are synced — standalone projects have no
 * draft row. A failure (network / 409 mid-publish) resets the last-synced
 * marker so the next rename retries instead of being silently locked out.
 */
export function useSyncDraftTitle(
  projectId: string,
  name: string,
  options: SyncDraftTitleOptions = {}
): void {
  const debounceMs = options.debounceMs ?? 800;
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId.startsWith('ve_')) return;
    const trimmed = name.trim();
    // Skip empty pill values (the blur handler replaces them with a
    // random name before any meaningful pause) and skip re-PUTing a
    // title that already synced.
    if (!trimmed || trimmed === lastSyncedRef.current) return;

    const timer = window.setTimeout(() => {
      lastSyncedRef.current = trimmed;
      void saveEditorSessionDraft(projectId, { title: trimmed }).catch(() => {
        // Transient failure: allow a retry on the next rename instead
        // of remembering a title the server never stored.
        lastSyncedRef.current = null;
      });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [projectId, name, debounceMs]);
}
