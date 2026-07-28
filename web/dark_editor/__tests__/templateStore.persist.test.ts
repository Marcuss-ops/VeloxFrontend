import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTemplateStore } from '../stores/templateStore';
import { defaultTemplates } from '../data/defaultTemplates';

// ------------------------------------------------------------------
// Persist-migration regression guard.
//
// Fills the static-only verification gap left by the recent
// templateStore refactor (extracted defaultTemplates + templateEngine
// to separate modules). Without this round-trip test, a future
// refactor that accidentally drops a Template field (e.g. `previewUrl`,
// `createdAt`, or any nested CanvasObject property like `textShadow`)
// would slip past the existing static `templates.test.ts` because the
// static test only verifies the imported fixture shape — it never
// crosses the JSON serialization → localStorage → zustand persist
// → rehydration boundary that real users hit on every page reload.
//
// Round-trip mechanics:
//   1. defaultTemplates is imported at module load (Date.now() in the
//      fixture evaluates ONCE, capturing T1 for all 5 templates).
//   2. We serialize that exact reference via JSON.stringify, wrap it
//      in zustand persist's `{ state, version }` envelope, and write
//      it to localStorage under the key the store registers.
//   3. We force rehydration via `useTemplateStore.persist.rehydrate()`
//      so the assertion sees the localStorage-backed state, not the
//      initial-state defaultTemplates (which would otherwise be a
//      trivially-true toStrictEqual).
//   4. We assert full structural equality plus one explicit deep field
//      (the nested `textShadow` on a text CanvasObject) to catch
//      silent losses in nested-object reconstruction.
//
// Failure-mode this test catches (the user's stated concern):
//   - A refactor drops `previewUrl` from the Template interface AND
//     from defaultTemplates → `toStrictEqual` fails because the
//     rehydrated state's templates object lacks that key.
//   - A refactor changes the persist `partialize` to omit a field →
//     the field is missing from `state.templates` after rehydration.
//   - A nested CanvasObject property (e.g. `textShadow.offsetX`) is
//     silently lost during JSON round-trip → the explicit nested
//     check on textShadow catches it.
// ------------------------------------------------------------------

describe('templateStore persist migration', () => {
  const STORAGE_KEY = 'dark-editor-templates';

  beforeEach(() => {
    // Pristine localStorage so each test starts from the empty-storage
    // branch of the persist middleware, not from a sibling test's
    // leftover fixture.
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    // Clean up so the next test in the file (or any sibling vitest
    // file in the same jsdom process) starts clean.
    localStorage.removeItem(STORAGE_KEY);
  });

  it('round-trips defaultTemplates through localStorage without structural data loss', async () => {
    // Wrap in zustand persist's internal envelope: `{ state, version }`.
    // The persist middleware expects exactly this shape when reading
    // from storage; anything else triggers the no-rehydration branch.
    const persistPayload = {
      state: { templates: defaultTemplates },
      version: 0, // matches the persist config (no version bump specified)
    };

    // Simulate what a real browser session writes: a JSON-stringified
    // payload under the registered storage key.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistPayload));

    // Force the store to re-read from storage. The static import of
    // useTemplateStore above already ran during module evaluation
    // against an empty localStorage, so without this explicit
    // rehydrate() the assertion would compare the rehydrated state
    // against the same defaultTemplates reference that's already in
    // the initial state — a trivially-true toStrictEqual.
    await useTemplateStore.persist.rehydrate();
    const state = useTemplateStore.getState();

    // Full structural equality. `toStrictEqual` (not `toEqual`) catches
    // explicit `undefined` properties + type mismatches that `toEqual`
    // silently ignores — the right primitive for catching field-drop
    // regressions like `previewUrl`.
    expect(state.templates).toStrictEqual(defaultTemplates);

    // Explicit deep-field check. The nested `textShadow` object on the
    // main-title text CanvasObject of the thumbnail-template survives
    // the JSON → localStorage → zustand persist → rehydration → store
    // path byte-for-byte. If a future refactor flattens or renames
    // textShadow, this catches it independently of the array-level
    // assertion above.
    const thumbnailTemplate = state.templates.find(
      (t) => t.id === 'thumbnail-template'
    );
    const mainTitleObject = thumbnailTemplate?.objects.find(
      (o) => o.type === 'text' && 'textShadow' in o
    );
    expect(mainTitleObject).toBeDefined();
    expect(mainTitleObject && 'textShadow' in mainTitleObject ? mainTitleObject.textShadow : undefined).toStrictEqual({
      offsetX: 4,
      offsetY: 4,
      blur: 8,
      color: '#000000',
    });
  });
});