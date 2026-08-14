// @vitest-environment jsdom
//
// Protection network for the editor session lifecycle
// (useEditorProjectSession). Pins the behaviors that must survive any
// refactor of the load path:
//   - editable gate loads and hydrates the project row + canvas
//   - `ve_*` sessions: 1280x720 → 1920x1080 legacy migration (x/y/width/
//     height ×1.5) and the source thumbnail pinned + refreshed
//   - non-legacy projects keep their stored coordinates untouched
//   - the "Layer 0" bootstrap placeholder is purged
//   - unauthorized / not_found / error gate states map to errors and
//     never call the project API
//   - the initial load is not counted as an edit; later edits mark dirty
//
// The YouTube session gate is mocked so each test can drive its state;
// the project API and the session-context fetch are stubbed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useEditorProjectSession } from '@/hooks/useEditorProjectSession';
import { useEditorStore } from '@/stores/editorStore';
import { selectOrderedObjects } from '@/lib/editorSelectors';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorTabsStore } from '@/stores/editorTabsStore';
import { getProject } from '@/lib/api';
import { getEditorSessionByProject } from '@/lib/api/bff';
import type { SessionGateState } from '@/hooks/useYouTubeSessionGate';

const baseSession = {
    id: 's1',
    workspace_id: 1,
    platform_account_id: 2,
    youtube_video_id: 'yt-1',
    velox_project_id: 've_1',
    desired_privacy: 'private',
    status: 'editing',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

const gate = vi.hoisted(() => ({
    state: { state: 'loading' } as SessionGateState,
}));

vi.mock('@/hooks/useYouTubeSessionGate', () => ({
    useYouTubeSessionGate: () => gate.state,
}));

vi.mock('@/lib/api', () => ({
    getProject: vi.fn(),
    saveProject: vi.fn(),
    listProjects: vi.fn(),
    deleteProject: vi.fn(),
}));

vi.mock('@/lib/api/bff', () => ({
    getEditorSessionByProject: vi.fn(),
}));

const sourceThumbnail = (overrides: Record<string, unknown> = {}) => ({
    id: 'st-1',
    type: 'image',
    name: 'Source Thumbnail',
    x: -62,
    y: -411,
    width: 1920,
    height: 1080,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    src: 'https://cdn/old-thumb.jpg',
    ...overrides,
});

const textObject = (overrides: Record<string, unknown> = {}) => ({
    id: 't-1',
    type: 'text',
    name: 'Title',
    text: 'Hello',
    x: 100,
    y: 50,
    width: 400,
    height: 80,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    ...overrides,
});

const layer0 = () => ({
    id: 'layer-0',
    type: 'rect',
    name: 'Layer 0',
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
});

const project = (id: string, canvas: Record<string, unknown>, type = 'project', name = 'Copertina') => ({
    id,
    name,
    type,
    canvas_json: canvas,
    preview_url: 'https://cdn/preview.png',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
});

beforeEach(() => {
    useEditorStore.getState().clearCanvas();
    useProjectStore.getState().setCurrentProject(null);
    useProjectStore.getState().setDirty(false);
    useEditorTabsStore.setState({ tabs: [] });
    localStorage.clear();
    gate.state = { state: 'loading' };
    vi.mocked(getProject).mockReset();
    vi.mocked(getEditorSessionByProject).mockReset();
});

afterEach(() => {
    cleanup();
});

describe('useEditorProjectSession', () => {
    it('loads a legacy ve_* session: migrates to 1920x1080, pins the thumbnail, purges Layer 0', async () => {
        gate.state = { state: 'editable_editing', session: baseSession };
        vi.mocked(getEditorSessionByProject).mockResolvedValue({
            ...baseSession,
            // Extended contract: thumbnail_url is the canonical wire name
            // and must win over the legacy source_thumbnail_url.
            thumbnail_url: 'https://cdn/fresh-thumb.jpg',
            source_thumbnail_url: 'https://cdn/stale-thumb.jpg',
        });
        vi.mocked(getProject).mockResolvedValue(project('ve_1', {
            width: 1280,
            height: 720,
            objects: [sourceThumbnail(), textObject(), layer0()],
        }));

        const { result } = renderHook(() => useEditorProjectSession('ve_1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        // canvas migrated to the canonical document size
        expect(useEditorStore.getState().canvasWidth).toBe(1920);
        expect(useEditorStore.getState().canvasHeight).toBe(1080);

        const objects = selectOrderedObjects(useEditorStore.getState());
        expect(objects.map((o) => o.name)).toEqual(['Source Thumbnail', 'Title']); // Layer 0 purged

        const thumbnail = objects[0];
        expect(thumbnail.type).toBe('image');
        if (thumbnail.type === 'image') {
            // pinned to the full document and refreshed from the session API
            expect(thumbnail.x).toBe(0);
            expect(thumbnail.y).toBe(0);
            expect(thumbnail.width).toBe(1920);
            expect(thumbnail.height).toBe(1080);
            expect(thumbnail.src).toBe('https://cdn/fresh-thumb.jpg');
        }

        // legacy coordinates scaled by 1.5
        const title = objects[1];
        expect(title.type).toBe('text');
        if (title.type === 'text') {
            expect(title.x).toBe(150);
            expect(title.y).toBe(75);
            expect(title.width).toBe(600);
        }

        // session context refresh uses the authenticated BFF client for the ve_* id
        expect(getEditorSessionByProject).toHaveBeenCalledWith('ve_1');

        // project row + tab registration + clean dirty flag
        expect(useProjectStore.getState().currentProject?.id).toBe('ve_1');
        expect(useProjectStore.getState().isDirty).toBe(false);
        expect(useEditorTabsStore.getState().tabs.map((t) => t.id)).toContain('ve_1');
        expect(result.current.error).toBeNull();
        expect(result.current.hydratedRef.current).toBe(true);
    });

    it('keeps non-legacy projects untouched (no scaling, stored size)', async () => {
        gate.state = { state: 'editable_editing', session: baseSession };
        vi.mocked(getProject).mockResolvedValue(project('proj-1', {
            width: 1920,
            height: 1080,
            objects: [textObject(), layer0()],
        }));

        const { result } = renderHook(() => useEditorProjectSession('proj-1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        const objects = selectOrderedObjects(useEditorStore.getState());
        expect(objects.map((o) => o.name)).toEqual(['Title']);

        const title = objects[0];
        expect(title.type).toBe('text');
        if (title.type === 'text') {
            expect(title.x).toBe(100);
            expect(title.y).toBe(50);
            expect(title.width).toBe(400);
        }
        expect(useEditorStore.getState().canvasWidth).toBe(1920);
    });

    it('maps unauthorized gate state to an error and never loads the project', async () => {
        gate.state = { state: 'unauthorized' };

        const { result } = renderHook(() => useEditorProjectSession('ve_1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('Authentication required');
        expect(getProject).not.toHaveBeenCalled();
    });

    it('maps gate error state to its message', async () => {
        gate.state = { state: 'error', message: 'youtube store not configured' };

        const { result } = renderHook(() => useEditorProjectSession('ve_1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('youtube store not configured');
        expect(getProject).not.toHaveBeenCalled();
    });

    it('survives a failed session-context refresh (thumbnail keeps the stored URL)', async () => {
        gate.state = { state: 'editable_editing', session: baseSession };
        vi.mocked(getEditorSessionByProject).mockRejectedValue(new Error('network down'));
        vi.mocked(getProject).mockResolvedValue(project('ve_1', {
            width: 1280,
            height: 720,
            objects: [sourceThumbnail()],
        }));

        const { result } = renderHook(() => useEditorProjectSession('ve_1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBeNull();

        const thumbnail = selectOrderedObjects(useEditorStore.getState())[0];
        expect(thumbnail.type).toBe('image');
        if (thumbnail.type === 'image') {
            expect(thumbnail.src).toBe('https://cdn/old-thumb.jpg');
        }
    });

    it('marks the project dirty only after the initial load (edits after hydration)', async () => {
        gate.state = { state: 'editable_editing', session: baseSession };
        vi.mocked(getProject).mockResolvedValue(project('ve_1', { objects: [textObject()] }));

        const { result } = renderHook(() => useEditorProjectSession('ve_1'));

        await waitFor(() => expect(result.current.hydratedRef.current).toBe(true));
        expect(useProjectStore.getState().isDirty).toBe(false);

        act(() => useEditorStore.getState().addObject(textObject({ id: 't-2' })));

        await waitFor(() => expect(useProjectStore.getState().isDirty).toBe(true));
        expect(result.current.loading).toBe(false);
    });
});
