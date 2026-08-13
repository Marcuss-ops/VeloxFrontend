// @vitest-environment jsdom
//
// Guards for the project-name layer (useProjectName): the rename pill,
// the empty-name fallback and the draft-title sync. These behaviors were
// extracted out of EditorWorkspace; pin them so a future refactor of the
// layer cannot silently break the rename UX.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useProjectName, generateRandomProjectName } from '@/hooks/useProjectName';
import { useProjectStore } from '@/stores/projectStore';
import { saveEditorSessionDraft } from '@/lib/api/bff';

vi.mock('@/lib/api/bff', () => ({
  saveEditorSessionDraft: vi.fn().mockResolvedValue({}),
}));

const mockSaveDraft = vi.mocked(saveEditorSessionDraft);

beforeEach(() => {
  useProjectStore.setState({
    currentProject: { id: 've_1', name: 'Copertina Iniziale', type: 'project', canvas_json: {}, preview_url: '', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  });
  mockSaveDraft.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('useProjectName', () => {
  it('reads the current project name from the store', () => {
    const { result } = renderHook(() => useProjectName('ve_1'));
    expect(result.current.projectName).toBe('Copertina Iniziale');
  });

  it('updates the store on rename keystrokes', () => {
    const { result } = renderHook(() => useProjectName('ve_1'));
    act(() => {
      result.current.handleProjectNameChange({ target: { value: 'Nuovo Nome' } } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(useProjectStore.getState().currentProject?.name).toBe('Nuovo Nome');
    expect(result.current.projectName).toBe('Nuovo Nome');
  });

  it('replaces an empty name on blur with a generated fallback', () => {
    useProjectStore.setState({
      currentProject: { id: 've_1', name: '   ', type: 'project', canvas_json: {}, preview_url: '', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    });
    const { result } = renderHook(() => useProjectName('ve_1'));
    act(() => {
      result.current.handleProjectNameBlur();
    });
    expect(useProjectStore.getState().currentProject?.name).toMatch(/^[A-Za-z]+-[A-Za-z]+-\d+$/);
  });

  it('does not generate a name when the blur has a real name', () => {
    const { result } = renderHook(() => useProjectName('ve_1'));
    act(() => {
      result.current.handleProjectNameBlur();
    });
    expect(useProjectStore.getState().currentProject?.name).toBe('Copertina Iniziale');
  });

  it('debounces a draft-title PUT for scoped projects', async () => {
    renderHook(() => useProjectName('ve_1'));
    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledWith('ve_1', { title: 'Copertina Iniziale' });
    });
  });
});

describe('generateRandomProjectName', () => {
  it('produces a Adjectival-Noun-number name', () => {
    expect(generateRandomProjectName()).toMatch(/^[A-Za-z]+-[A-Za-z]+-\d+$/);
  });
});
