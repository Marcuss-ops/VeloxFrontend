// Protection test for the P4-bis dead-code removal.
//
// The removed panels (PropertiesPanel, AIDialog, FilterPanel, template/
// collaboration/versioning/presets systems) were the only UI consumers of
// several store actions and API clients. This test pins the LIVE surface
// that must survive the removal:
//   - the store registry keeps every object/effect/history action
//   - the @/lib/api facade still exposes the live domain clients
//   - the filter chain used by the canvas renderer stays importable
//
// If a future refactor re-wires one of the removed panels back into the
// app, this test is what the new UI must keep intact.

import { describe, expect, it } from 'vitest';
import { useEditorStore } from '@/stores/editorStore';
import {
    getProject,
    saveProject,
    listDriveAssets,
    uploadImage,
    translateText,
    listFolders,
    removeBackground,
} from '@/lib/api';

const storeActions = [
    // objectSlice
    'addObject', 'updateObject', 'updateObjectLive', 'deleteObject',
    'selectObject', 'duplicateSelected', 'copySelected', 'pasteClipboard',
    'loadObjects', 'clearCanvas', 'moveLayerUp', 'sendToBack',
    // historySlice
    'undo', 'redo', 'commitMutation', 'commitLiveMutation', 'saveToHistory',
    // effectsSlice
    'applyBlur', 'applySharpen', 'applyPixelation', 'applyAllFilters',
    'applyTextShadow', 'applyTextStroke', 'applyTextGradient', 'applyTextCurve',
    'applyDropShadow', 'applyBorderRadius', 'applyShapeGradient',
    'applyTexture', 'clearShapeEffects',
];

describe('editor live surface (P4-bis protection)', () => {
    it('store registry keeps every object/effect/history action', () => {
        const state = useEditorStore.getState() as Record<string, unknown>;
        for (const action of storeActions) {
            expect(typeof state[action], action).toBe('function');
        }
    });

    it('api facade still exposes the live domain clients', () => {
        expect(typeof getProject).toBe('function');
        expect(typeof saveProject).toBe('function');
        expect(typeof listDriveAssets).toBe('function');
        expect(typeof uploadImage).toBe('function');
        expect(typeof translateText).toBe('function');
        expect(typeof listFolders).toBe('function');
        expect(typeof removeBackground).toBe('function');
    });

    // The canvas renderer chain (CanvasRenderers → imageFilters) is pinned
    // by canvasObjectNode.render.test.tsx, which mounts the real renderer.
});
