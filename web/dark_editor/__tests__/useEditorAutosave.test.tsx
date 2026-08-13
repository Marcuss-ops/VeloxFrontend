// @vitest-environment jsdom
//
// Protection network for the editor autosave flow (useEditorAutosave).
// Pins the behaviors that must survive any refactor of the persistence
// layer:
//   - no writes before hydration / without a project
//   - no writes for read-only sessions
//   - 800ms debounce collapsing rapid edits into a single save
//   - preview capture throttled to one upload every 3s
//   - explicit flush/save requests force a preview refresh
//   - beforeunload guard warns only when dirty
//
// The event bus (lib/editorEvents) and both stores are used for real;
// only the I/O boundary (lib/api + canvas preview capture) is mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useEditorAutosave } from '@/hooks/useEditorAutosave';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { requestEditorFlush, requestEditorSave } from '@/lib/editorEvents';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { uploadImage, saveProject as apiSaveProject } from '@/lib/api';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';
import type { SessionGateState } from '@/hooks/useYouTubeSessionGate';

vi.mock('@/lib/api', () => ({
    uploadImage: vi.fn(),
    saveProject: vi.fn(),
    listProjects: vi.fn(),
    getProject: vi.fn(),
    deleteProject: vi.fn(),
}));

vi.mock('@/lib/api/bff', () => ({
    uploadMediaAsset: vi.fn(),
    updateEditorSessionThumbnail: vi.fn(),
}));

vi.mock('@/lib/canvasPreview', () => ({
    captureEditorCanvasPreviewFile: vi.fn(),
}));

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

const editableGate: SessionGateState = { state: 'editable_editing', session: baseSession };
const readonlyGate: SessionGateState = { state: 'readonly_published', session: baseSession };

const project = {
    id: 've_1',
    name: 'Copertina',
    type: 'project',
    canvas_json: {},
    preview_url: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

const makeObject = (id: string) => ({
    id,
    type: 'text' as const,
    text: 'hello',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    name: id,
});

const defaultArgs = (hydrated = true) => ({
    canvasRef: { current: null },
    sessionGate: editableGate,
    hydratedRef: { current: hydrated },
});

beforeEach(() => {
    useEditorStore.getState().clearCanvas();
    useProjectStore.getState().setCurrentProject(project);
    useProjectStore.getState().setDirty(false);
    vi.mocked(uploadImage).mockResolvedValue({ url: '/media/preview-1.png', filename: 'preview-1.png' });
    vi.mocked(uploadMediaAsset).mockResolvedValue('media-asset-1');
    vi.mocked(updateEditorSessionThumbnail).mockResolvedValue(undefined);
    vi.mocked(captureEditorCanvasPreviewFile).mockResolvedValue(new File(['x'], 'preview.png', { type: 'image/png' }));
    vi.mocked(apiSaveProject).mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('useEditorAutosave', () => {
    it('never saves before hydration even when dirty', async () => {
        vi.useFakeTimers();
        renderHook(() => useEditorAutosave(defaultArgs(false)));

        act(() => {
            useProjectStore.getState().setDirty(true);
            useEditorStore.getState().addObject(makeObject('a'));
        });

        await vi.advanceTimersByTimeAsync(2000);
        expect(apiSaveProject).not.toHaveBeenCalled();
        expect(uploadImage).not.toHaveBeenCalled();
    });

    it('does not save for read-only sessions', async () => {
        vi.useFakeTimers();
        renderHook(() => useEditorAutosave({
            canvasRef: { current: null },
            sessionGate: readonlyGate,
            hydratedRef: { current: true },
        }));

        act(() => {
            useProjectStore.getState().setDirty(true);
            useEditorStore.getState().addObject(makeObject('a'));
        });

        await vi.advanceTimersByTimeAsync(2000);
        expect(apiSaveProject).not.toHaveBeenCalled();
    });

    it('debounces rapid edits into a single save after 800ms', async () => {
        vi.useFakeTimers();
        renderHook(() => useEditorAutosave(defaultArgs()));
        // Fake timers start at epoch; move past the 3s preview throttle so
        // the first save captures a fresh preview (as in real runtime).
        await vi.advanceTimersByTimeAsync(10000);

        act(() => {
            useProjectStore.getState().setDirty(true);
            useEditorStore.getState().addObject(makeObject('a'));
        });
        await vi.advanceTimersByTimeAsync(300);
        act(() => useEditorStore.getState().addObject(makeObject('b')));
        await vi.advanceTimersByTimeAsync(300);
        act(() => useEditorStore.getState().addObject(makeObject('c')));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(900);
        });

        expect(apiSaveProject).toHaveBeenCalledTimes(1);
        // first save captures and uploads a fresh preview
        expect(captureEditorCanvasPreviewFile).toHaveBeenCalledTimes(1);
        // ve_* projects persist the preview as a durable media asset and
        // attach it to the session (thumbnail_media_id) so the Copertine
        // hub renders the latest cover state.
        expect(uploadMediaAsset).toHaveBeenCalledTimes(1);
        expect(updateEditorSessionThumbnail).toHaveBeenCalledWith('ve_1', 'media-asset-1');
        expect(uploadImage).not.toHaveBeenCalled();
        // the store action wraps the payload: canvas data + preview filename
        expect(apiSaveProject).toHaveBeenCalledWith(expect.objectContaining({
            id: 've_1',
            preview_filename: undefined,
        }));
    });

    it('throttles preview uploads to one every 3s', async () => {
        vi.useFakeTimers();
        renderHook(() => useEditorAutosave(defaultArgs()));
        await vi.advanceTimersByTimeAsync(10000);

        act(() => {
            useProjectStore.getState().setDirty(true);
            useEditorStore.getState().addObject(makeObject('a'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(900);
        });
        expect(apiSaveProject).toHaveBeenCalledTimes(1);
        expect(captureEditorCanvasPreviewFile).toHaveBeenCalledTimes(1);

        // A second save inside the 3s window skips the preview capture.
        // The store resets isDirty after a successful save, so mark dirty
        // again before the next edit.
        act(() => {
            useProjectStore.getState().setDirty(true);
            useEditorStore.getState().addObject(makeObject('b'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(900);
        });
        expect(apiSaveProject).toHaveBeenCalledTimes(2);
        // only one preview capture/upload for two saves inside the window
        expect(captureEditorCanvasPreviewFile).toHaveBeenCalledTimes(1);
        expect(uploadMediaAsset).toHaveBeenCalledTimes(1);
        expect(updateEditorSessionThumbnail).toHaveBeenCalledTimes(1);
        expect(uploadImage).not.toHaveBeenCalled();
    });

    it('saves without a preview capture when the capture yields nothing', async () => {
        vi.useFakeTimers();
        vi.mocked(captureEditorCanvasPreviewFile).mockResolvedValue(null);
        renderHook(() => useEditorAutosave(defaultArgs()));

        act(() => {
            useProjectStore.getState().setDirty(true);
            useEditorStore.getState().addObject(makeObject('a'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(900);
        });

        expect(apiSaveProject).toHaveBeenCalledTimes(1);
        expect(uploadImage).not.toHaveBeenCalled();
        expect(uploadMediaAsset).not.toHaveBeenCalled();
        expect(updateEditorSessionThumbnail).not.toHaveBeenCalled();
    });

    it('flush requests force a save with a fresh preview', async () => {
        renderHook(() => useEditorAutosave(defaultArgs()));

        await act(async () => {
            await requestEditorFlush();
        });

        expect(apiSaveProject).toHaveBeenCalledTimes(1);
        expect(captureEditorCanvasPreviewFile).toHaveBeenCalledTimes(1);
        expect(uploadMediaAsset).toHaveBeenCalledTimes(1);
        expect(updateEditorSessionThumbnail).toHaveBeenCalledWith('ve_1', 'media-asset-1');
    });

    it('explicit save requests (keyboard shortcuts) force a save', async () => {
        renderHook(() => useEditorAutosave(defaultArgs()));

        requestEditorSave();

        await waitFor(() => expect(apiSaveProject).toHaveBeenCalledTimes(1));
        expect(captureEditorCanvasPreviewFile).toHaveBeenCalledTimes(1);
    });

    it('beforeunload warns only while dirty', () => {
        renderHook(() => useEditorAutosave(defaultArgs()));

        const cleanEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(cleanEvent);
        expect(cleanEvent.defaultPrevented).toBe(false);

        act(() => useProjectStore.getState().setDirty(true));
        const dirtyEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);
    });
});
