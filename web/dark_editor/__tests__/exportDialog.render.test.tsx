// @vitest-environment jsdom
//
// Protection test for the ExportDialog refactor (987 LOC → composition
// root). Pins the composition contract:
//   - opening via the uiStore flag renders the live publish-flow panel
//   - closing swaps to the dormant legacy panel (never visible)
//   - the onClose prop overrides the store close
//
// All I/O (translation, canvas capture, BFF uploads) and the YouTube
// target hook are mocked; the stores are real.

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ExportDialog from '@/components/editor/ExportDialog';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';

// The hook's effects depend on these callback identities (the open-reset
// effect watches resetSelection), so the mock must return the SAME object on
// every call — fresh functions per render would re-run that effect forever.
const targets = vi.hoisted(() => {
    const stable = {
        videos: [],
        visibleVideos: [],
        latestPerChannel: [],
        selectedVideoIds: [],
        setSelectedVideoIds: () => {},
        selectedCount: 0,
        toggleVideo: () => {},
        selectAllVisible: () => {},
        deselectAll: () => {},
        selectLatest: () => {},
        resetSelection: () => {},
        loading: false,
        error: null,
        warnings: [],
    };
    return {
        useBatchYouTubeTargets: () => stable,
    };
});

vi.mock('@/hooks/useBatchYouTubeTargets', () => ({
    useBatchYouTubeTargets: targets.useBatchYouTubeTargets,
}));

vi.mock('@/lib/api', () => ({
    translateText: vi.fn(),
}));

vi.mock('@/lib/canvasPreview', () => ({
    canvasStateSignature: vi.fn(() => 'signature'),
    captureEditorCanvasBlob: vi.fn(async () => null),
    sha256Hex: vi.fn(async () => 'sha256'),
}));

vi.mock('@/lib/api/bff', () => ({
    uploadMediaAsset: vi.fn(),
    updateEditorSessionThumbnail: vi.fn(),
}));

beforeEach(() => {
    useEditorStore.getState().clearCanvas();
    useProjectStore.getState().setCurrentProject(null);
    useUIStore.getState().setExportDialog(true);
});

afterEach(() => {
    cleanup();
    useUIStore.getState().setExportDialog(false);
    vi.clearAllMocks();
});

describe('ExportDialog composition', () => {
    it('renders the live publish-flow panel when open', async () => {
        render(<ExportDialog />);

        expect(await screen.findByText('Pubblica copertine')).toBeTruthy();
        expect(screen.getByText('Esporta PNG')).toBeTruthy();
        expect(screen.getByText('Titolo, descrizione e tag')).toBeTruthy();
    });

    it('swaps to the dormant legacy panel (closed dialog) when the store flag drops', async () => {
        render(<ExportDialog />);
        expect(await screen.findByText('Pubblica copertine')).toBeTruthy();

        act(() => useUIStore.getState().setExportDialog(false));

        // Publish panel unmounts; the legacy dialog is closed, so no
        // publish content remains visible.
        expect(screen.queryByText('Pubblica copertine')).toBeNull();
        expect(screen.queryByText('Esporta PNG')).toBeNull();
    });

    it('uses the onClose prop instead of the store close', async () => {
        const onClose = vi.fn();
        render(<ExportDialog onClose={onClose} />);
        expect(await screen.findByText('Pubblica copertine')).toBeTruthy();

        fireEvent.click(screen.getByText('Annulla'));

        expect(onClose).toHaveBeenCalledTimes(1);
        // the store flag is untouched when a custom onClose is provided
        expect(useUIStore.getState().showExportDialog).toBe(true);
    });
});
