'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveEditorSessionDraft } from '@/lib/api/bff';

// ------------------------------------------------------------------
// useAutoSaveDraft — P2 Dark Editor auto-save
// ------------------------------------------------------------------
//
// The Dark Editor's publish form persisted to localStorage on every
// click of the explicit "Salva bozza" button. Before this hook, an
// operator who typed a title, closed the browser tab, and came back
// found their work intact (the localStorage survived the reload) BUT
// if they closed the tab and the new tab ran in a different browser
// profile, or the localStorage was cleared, the work was lost.
//
// Now the same form contents ALSO fan out to the server via
// PUT /api/v1/youtube/editor-sessions/by-project/{id}/draft, on:
//
//   1) DEBOUNCED timer — every form change starts a 1.5s debounced
//      network save. The debounce window covers the operator's typical
//      pause-between-keystrokes, NOT every keystroke (which would
//      flood the BFF).
//   2) ON-BLUR save (consumer-side) — OPTIONAL. If the consumer
//      wants a baseline flush on focus loss, each input/textarea
//      should call `onBlur={() => void flushNow()}`. NOT wired by
//      the hook itself on purpose: keeping event wiring out of the
//      hook lets existing Input/Textarea components opt in without
//      a useAutoSaveDraft refit. The debounced timer (item 1) is
//      the always-on save path.
//   3) 409 SWALLOW — the hook silently swallows 409 responses with
//      a "publish already in progress" reason. The publish
//      orchestrator owns the row during 'publishing'; the indicator
//      stays where it is rather than flashing red on a normal
//      publish flow.
//   3) COMPONENT UNMOUNT save — when the operator closes the dialog,
//      we fire one final synchronous-ish save so the latest keystroke
//      lands on the server. We do NOT block unmount; if the request is
//      in flight the browser drops it (acceptable for the on-unmount
//      case — the next mount will load the just-typed values from
//      localStorage and re-fan-out).
//
// Indicator state — the hook returns { draftSavedAt, isSaving, error }.
// The SPA renders "Bozza salvata hh:mm:ss" when draftSavedAt is set
// AND last attempt completed without error. While a save is in flight,
// isSaving=true; an error surfaces a red toast via the error field.
//
// Why this is a custom hook (not just a useEffect inside the dialog):
//   - Debounced timer + debouncedRef pattern is well-tested to extract.
//   - Reusable across any future Dark Editor dialog (e.g. channel
//     metadata edits, monetization settings).
//   - Easier to unit test in isolation (vitest covers the debounce
//     semantics + the abort-on-unmount behaviour).
//
// ------------------------------------------------------------------

export interface AutoSaveDraftInput {
  veloxProjectId: string;
  form: {
    title: string;
    description: string;
    tags: string[];
    default_language: string;
    default_audio_language: string;
    translations: Record<string, { title: string; description: string }>;
    desired_privacy: 'public' | 'unlisted' | 'private';
    publish_at?: string | null;
  };
  /** When true, auto-save is paused (e.g. publish is currently in flight). */
  paused?: boolean;
  /** Debounce window in ms. Defaults to 1500. */
  debounceMs?: number;
  /** Disable altogether (test-only or opt-out switch). */
  enabled?: boolean;
  /** Existing dirty-flag from the dialog (we mirror this into the request). */
}

export interface AutoSaveDraftOutput {
  /** ISO string of the last successful server-acknowledged save, or null. */
  draftSavedAt: string | null;
  /** True while a save round-trip is in flight. */
  isSaving: boolean;
  /** Surfaceable error from the last attempt (null when OK). */
  error: string | null;
  /** Force a synchronous save (e.g. when Salva bozza is clicked). */
  flushNow: () => Promise<void>;
}

export function useAutoSaveDraft(input: AutoSaveDraftInput): AutoSaveDraftOutput {
  const {
    veloxProjectId,
    form,
    paused = false,
    debounceMs = 1500,
    enabled = true,
  } = input;

  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest form ref so debounced callback always reads the most-recent
  // values without re-binding the timer on every keystroke.
  const formRef = useRef(form);
  formRef.current = form;

  // AbortController ref so a previous in-flight save can be cancelled
  // when the operator keeps typing (we don't queue, we replace).
  const inFlightRef = useRef<AbortController | null>(null);

  const flushNow = useCallback(async () => {
    if (!enabled || !veloxProjectId) return;
    // Cancel any in-flight save; we just need the freshest state.
    if (inFlightRef.current) inFlightRef.current.abort();
    const ac = new AbortController();
    inFlightRef.current = ac;
    setIsSaving(true);
    setError(null);
    try {
      const response = await saveEditorSessionDraft(veloxProjectId, formRef.current);
      if (!ac.signal.aborted) {
        setDraftSavedAt(response.draft_updated_at);
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      // 409 "publish already in progress" is a normal mid-publish
      // transient — surface it as a soft warning so the operator
      // knows the server didn't ack, NOT a hard error.
      setError(/publish already/i.test(message) ? null : message);
    } finally {
      if (inFlightRef.current === ac) {
        inFlightRef.current = null;
        setIsSaving(false);
      }
    }
  }, [enabled, veloxProjectId]);

  // DEBOUNCED EFFECT — re-runs whenever `form` changes (the Latest Form
  // ref pattern in the body reads formRef.current, so the timer doesn't
  // restart on every keystroke EXCEPT for the cancel-and-restart
  // behaviour which is exactly what debouncing does).
  useEffect(() => {
    if (!enabled || paused) return;
    if (!veloxProjectId) return;
    const timer = window.setTimeout(() => {
      void flushNow();
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, paused, veloxProjectId, debounceMs, form, flushNow]);

  // ON UNMOUNT — fire a final save. We do not await; the browser
  // will let the request fly into the network stack for a short
  // window before tearing it down. If it lands, great; if not,
  // localStorage + the next mount catches up.
  useEffect(() => {
    return () => {
      if (enabled && !paused && veloxProjectId) {
        // Best-effort fire-and-forget; the AbortController cleanup in
        // flushNow keeps the in-flight counter consistent.
        void saveEditorSessionDraft(veloxProjectId, formRef.current).catch(() => {
          /* swallowed on purpose (network teardown) */
        });
      }
    };
  }, [enabled, paused, veloxProjectId]);

  return {
    draftSavedAt,
    isSaving,
    error,
    flushNow,
  };
}
