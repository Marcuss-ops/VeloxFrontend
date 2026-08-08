// @vitest-environment jsdom
//
// Unit test for useSyncDraftTitle — the editor hook that syncs the
// rename pill to the InstaEdit draft (partial PUT /draft with
// { title } only) so the Copertine hub card shows the operator's
// real project name.
//
// Contract under test:
//   1. For ve_* project ids the debounced PUT fires with { title }
//      ONLY (never a full-form body — the backend merges it against
//      description/tags/privacy).
//   2. For standalone (non ve_) projects nothing is PUT (no draft row).
//   3. An empty pill value does not PUT.
//   4. A failed PUT resets the last-synced marker so the next rename
//      retries.
//   5. Keystroke-level renames collapse to a single PUT (debounce).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { useSyncDraftTitle } from '@/hooks/useSyncDraftTitle';
import { saveEditorSessionDraft } from '@/lib/api/bff';

vi.mock('@/lib/api/bff', () => ({
  saveEditorSessionDraft: vi.fn(),
}));

const mockedSave = vi.mocked(saveEditorSessionDraft);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
  mockedSave.mockResolvedValue({
    velox_project_id: 've_1',
    draft_title: 'x',
    draft_description: '',
    draft_tags: [],
    draft_default_language: '',
    draft_default_audio_language: '',
    draft_translations: {},
    draft_desired_privacy: 'private',
    draft_updated_at: '2026-08-08T00:00:00.000Z',
  } as never);
});

function advanceDebounce(): void {
  act(() => {
    vi.advanceTimersByTime(850);
  });
}

describe('useSyncDraftTitle', () => {
  it('PUTs the renamed title to the draft endpoint after the debounce', () => {
    const { rerender } = renderHook(
      ({ projectId, name }) => useSyncDraftTitle(projectId, name),
      { initialProps: { projectId: 've_1', name: 'Astro-Nebula-1' } },
    );

    // Rename keystroke-by-keystroke; only the final value should PUT.
    rerender({ projectId: 've_1', name: 'Rap-' });
    rerender({ projectId: 've_1', name: 'Rap-Vortex' });
    rerender({ projectId: 've_1', name: 'Rap-Vortex-15' });

    expect(mockedSave).not.toHaveBeenCalled();

    advanceDebounce();

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith('ve_1', { title: 'Rap-Vortex-15' });
  });

  it('does not PUT anything for a standalone (non ve_) project', () => {
    const { rerender } = renderHook(
      ({ projectId, name }) => useSyncDraftTitle(projectId, name),
      { initialProps: { projectId: 'local-123', name: 'My Project' } },
    );
    rerender({ projectId: 'local-123', name: 'Renamed' });
    advanceDebounce();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('does not PUT an empty pill value', () => {
    renderHook(() => useSyncDraftTitle('ve_1', '   '));
    advanceDebounce();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('retries after a failed PUT when the name changes again', async () => {
    mockedSave.mockRejectedValueOnce(new Error('publish already in progress'));
    mockedSave.mockResolvedValueOnce({
      velox_project_id: 've_1',
      draft_title: 'Retry',
      draft_description: '',
      draft_tags: [],
      draft_default_language: '',
      draft_default_audio_language: '',
      draft_translations: {},
      draft_desired_privacy: 'private',
      draft_updated_at: '2026-08-08T00:00:00.000Z',
    } as never);

    const { rerender } = renderHook(
      ({ projectId, name }) => useSyncDraftTitle(projectId, name),
      { initialProps: { projectId: 've_1', name: 'First' } },
    );
    advanceDebounce();
    // Let the rejection settle (the hook swallows it + resets the
    // last-synced marker so the next rename retries).
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedSave).toHaveBeenCalledTimes(1);

    // Rename to a different value: the failed marker was reset, so
    // the sync retries instead of being locked out.
    rerender({ projectId: 've_1', name: 'Second' });
    advanceDebounce();
    expect(mockedSave).toHaveBeenCalledTimes(2);
    expect(mockedSave).toHaveBeenLastCalledWith('ve_1', { title: 'Second' });
  });

  it('does not re-PUT an unchanged title after a successful sync', () => {
    const { rerender } = renderHook(
      ({ projectId, name }) => useSyncDraftTitle(projectId, name),
      { initialProps: { projectId: 've_1', name: 'Same' } },
    );
    advanceDebounce();
    expect(mockedSave).toHaveBeenCalledTimes(1);

    // Re-render with the same name (e.g. hydration re-render) → no PUT.
    rerender({ projectId: 've_1', name: 'Same' });
    advanceDebounce();
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});
