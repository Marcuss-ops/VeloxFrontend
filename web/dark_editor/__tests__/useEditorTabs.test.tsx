// @vitest-environment jsdom
//
// Protection network for the editor multi-tab flow (useEditorTabs).
// Pins the behaviors that must survive any refactor of the tab/navigation
// layer:
//   - hydration of the persisted tab list
//   - switching tabs flushes pending saves then navigates to the sibling
//     editor route with the return context
//   - closing the active tab confirms unsaved changes, flushes, then
//     navigates to the last remaining tab (or back to Copertine)
//   - closing an inactive tab only updates the persisted list
//   - the active tab label follows the current project name
//
// The real stores and event bus are used; only next/navigation is mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useEditorTabsStore } from '@/stores/editorTabsStore';
import { useProjectStore } from '@/stores/projectStore';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
        replace: vi.fn(),
    }),
}));

const TABS_KEY = 'instaeditor.open-editor-tabs.v1';
const project = (id: string, name: string) => ({
    id,
    name,
    type: 'project',
    canvas_json: {},
    preview_url: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
});

beforeEach(() => {
    localStorage.clear();
    useEditorTabsStore.setState({ tabs: [] });
    useProjectStore.getState().setCurrentProject(null);
    useProjectStore.getState().setDirty(false);
    mockPush.mockClear();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('useEditorTabs', () => {
    it('hydrates the persisted tab list on mount', () => {
        localStorage.setItem(
            TABS_KEY,
            JSON.stringify([
                { id: 'p1', name: 'Cover A', openedAt: 1, lastActiveAt: 1 },
                { id: 'p2', name: 'Cover B', openedAt: 2, lastActiveAt: 2 },
            ]),
        );

        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        expect(result.current.openTabs.map((t) => t.id)).toEqual(['p1', 'p2']);
    });

    it('ignores corrupt persisted tab data', () => {
        localStorage.setItem(TABS_KEY, 'not-json');

        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        expect(result.current.openTabs).toEqual([]);
    });

    it('keeps the active tab label in sync with the project name', () => {
        localStorage.setItem(
            TABS_KEY,
            JSON.stringify([{ id: 'p1', name: 'Vecchio nome', openedAt: 1, lastActiveAt: 1 }]),
        );
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        act(() => useProjectStore.getState().setCurrentProject(project('p1', 'Nuovo nome')));

        expect(result.current.openTabs.find((t) => t.id === 'p1')?.name).toBe('Nuovo nome');
    });

    it('switchEditorTab is a no-op for the current project', async () => {
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        await result.current.switchEditorTab('p1');

        expect(mockPush).not.toHaveBeenCalled();
    });

    it('switchEditorTab flushes then navigates to the sibling editor route', async () => {
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        await result.current.switchEditorTab('p2');

        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining('/instaeditor/editor/p2'),
        );
        expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining('return_to=%2Fapp%2Fcovers'),
        );
    });

    it('closeEditorTab of an inactive tab just closes it', async () => {
        localStorage.setItem(
            TABS_KEY,
            JSON.stringify([
                { id: 'p1', name: 'Cover A', openedAt: 1, lastActiveAt: 2 },
                { id: 'p2', name: 'Cover B', openedAt: 1, lastActiveAt: 1 },
            ]),
        );
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        await act(async () => {
            await result.current.closeEditorTab('p2');
        });

        expect(result.current.openTabs.map((t) => t.id)).toEqual(['p1']);
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('closeEditorTab of the clean active tab navigates to the last remaining tab', async () => {
        localStorage.setItem(
            TABS_KEY,
            JSON.stringify([
                { id: 'p1', name: 'Cover A', openedAt: 1, lastActiveAt: 2 },
                { id: 'p2', name: 'Cover B', openedAt: 1, lastActiveAt: 1 },
            ]),
        );
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        await act(async () => {
            await result.current.closeEditorTab('p1');
        });

        expect(result.current.openTabs.map((t) => t.id)).toEqual(['p2']);
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/instaeditor/editor/p2'));
    });

    it('closeEditorTab of the dirty active tab asks for confirmation', async () => {
        vi.stubGlobal('confirm', vi.fn(() => false));
        localStorage.setItem(
            TABS_KEY,
            JSON.stringify([{ id: 'p1', name: 'Cover A', openedAt: 1, lastActiveAt: 1 }]),
        );
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));
        act(() => useProjectStore.getState().setDirty(true));

        await result.current.closeEditorTab('p1');

        expect(window.confirm).toHaveBeenCalled();
        // cancelled: the tab stays
        expect(result.current.openTabs.map((t) => t.id)).toEqual(['p1']);
    });

    it('closeEditorTab of the dirty active tab closes it when confirmed', async () => {
        vi.stubGlobal('confirm', vi.fn(() => true));
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));
        act(() => useProjectStore.getState().setDirty(true));

        await act(async () => {
            await result.current.closeEditorTab('p1');
        });

        expect(result.current.openTabs).toHaveLength(0);
    });

    it('closing the last tab returns to the Copertine hub', async () => {
        // jsdom's Location.assign is non-configurable, so swap the whole
        // location object with a stand-in carrying an assign spy.
        const originalLocation = window.location;
        const assignMock = vi.fn();
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...originalLocation, assign: assignMock },
        });
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        await act(async () => {
            await result.current.closeEditorTab('p1');
        });

        expect(assignMock).toHaveBeenCalledWith('/app/covers');
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        });
    });

    it('closing the active tab navigates to the last remaining open tab', async () => {
        localStorage.setItem(
            TABS_KEY,
            JSON.stringify([
                { id: 'p1', name: 'Cover A', openedAt: 1, lastActiveAt: 2 },
                { id: 'p2', name: 'Cover B', openedAt: 1, lastActiveAt: 1 },
                { id: 'p3', name: 'Cover C', openedAt: 1, lastActiveAt: 1 },
            ]),
        );
        const { result } = renderHook(() => useEditorTabs('p1', '/app/covers'));

        await act(async () => {
            await result.current.closeEditorTab('p1');
        });

        expect(result.current.openTabs.map((t) => t.id)).toEqual(['p2', 'p3']);
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/instaeditor/editor/p3'));
    });
});
