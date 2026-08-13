// @vitest-environment jsdom
//
// Protection test for the editor asset sources (useEditorAssets).
// Pins the live behaviors that must survive dead-code cleanup:
//   - custom assets hydration from localStorage
//   - persisted Drive folder preference
//   - paged Drive refresh when the assets tab is active
//   - add-to-canvas actions wiring into the editor store
//   - upload flow persisting the new asset
//
// The `@/lib/api` module is mocked so no real HTTP happens; the hook's
// I/O boundary is exactly what this test protects.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import {
    useEditorAssets,
    CUSTOM_ASSETS_STORAGE_KEY,
    DRIVE_ASSET_FOLDER_KEY,
    DEFAULT_DRIVE_ASSET_FOLDER,
} from '@/hooks/useEditorAssets';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

vi.mock('@/lib/api', () => ({
    listDriveAssets: vi.fn(),
    driveAssetContentUrl: vi.fn((asset: { content_url: string }) => asset.content_url),
    resolveEditorAssetUrl: vi.fn((url: string) => url),
    uploadImage: vi.fn(),
}));

import { listDriveAssets, driveAssetContentUrl, uploadImage } from '@/lib/api';

const driveAsset = (id: string) => ({
    id,
    name: `${id}.png`,
    mime_type: 'image/png',
    content_url: `https://drive.example/${id}.png`,
});

const pagedResponse = (items: unknown[], next_page_token?: string) => ({
    items,
    next_page_token,
    drive_account_id: 7,
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    useEditorStore.getState().clearCanvas();
    useUIStore.getState().toasts = [];
});

describe('useEditorAssets', () => {
    beforeEach(() => {
        useEditorStore.getState().clearCanvas();
        useUIStore.getState().toasts = [];
    });

    it('hydrates custom assets and the Drive folder from localStorage', () => {
        localStorage.setItem(
            CUSTOM_ASSETS_STORAGE_KEY,
            JSON.stringify([{ id: 'c1', name: 'logo', src: 'https://cdn/logo.png' }]),
        );
        localStorage.setItem(DRIVE_ASSET_FOLDER_KEY, 'custom-folder-id');

        const { result } = renderHook(() => useEditorAssets('design'));

        expect(result.current.customAssets).toHaveLength(1);
        expect(result.current.customAssets[0].name).toBe('logo');
        expect(result.current.driveAssetFolder).toBe('custom-folder-id');
    });

    it('refreshes the Drive listing (paged) when the assets tab is active', async () => {
        vi.mocked(listDriveAssets)
            .mockResolvedValueOnce(pagedResponse([driveAsset('a')], 'page-2'))
            .mockResolvedValueOnce(pagedResponse([driveAsset('b')]));

        const { result } = renderHook(() => useEditorAssets('assets'));

        await waitFor(() => expect(result.current.driveAssetsLoading).toBe(false));
        expect(result.current.driveAssets.map((a) => a.id)).toEqual(['a', 'b']);
        expect(listDriveAssets).toHaveBeenCalledTimes(2);
        expect(listDriveAssets).toHaveBeenNthCalledWith(1, DEFAULT_DRIVE_ASSET_FOLDER, undefined, undefined);
        expect(listDriveAssets).toHaveBeenNthCalledWith(2, DEFAULT_DRIVE_ASSET_FOLDER, 7, 'page-2');
        // the active folder is persisted for the next session
        expect(localStorage.getItem(DRIVE_ASSET_FOLDER_KEY)).toBe(DEFAULT_DRIVE_ASSET_FOLDER);
    });

    it('surfaces the Drive listing error instead of throwing', async () => {
        vi.mocked(listDriveAssets).mockRejectedValueOnce(new Error('drive 403'));

        const { result } = renderHook(() => useEditorAssets('assets'));

        await waitFor(() => expect(result.current.driveAssetsLoading).toBe(false));
        expect(result.current.driveAssetsError).toContain('drive 403');
        expect(result.current.driveAssets).toHaveLength(0);
    });

    it('addDriveAssetToCanvas adds an image object with the content URL', () => {
        const { result } = renderHook(() => useEditorAssets('design'));

        result.current.addDriveAssetToCanvas(driveAsset('a'));

        const objects = useEditorStore.getState().objects;
        expect(objects).toHaveLength(1);
        expect(objects[0].type).toBe('image');
        if (objects[0].type === 'image') {
            expect(objects[0].src).toBe('https://drive.example/a.png');
        }
        expect(driveAssetContentUrl).toHaveBeenCalledWith(driveAsset('a'));
    });

    it('addCustomAssetToCanvas adds an image object with the custom src', () => {
        const { result } = renderHook(() => useEditorAssets('design'));

        result.current.addCustomAssetToCanvas({ id: 'c1', name: 'logo', src: 'https://cdn/logo.png' });

        const objects = useEditorStore.getState().objects;
        expect(objects).toHaveLength(1);
        expect(objects[0].type).toBe('image');
        if (objects[0].type === 'image') {
            expect(objects[0].src).toBe('https://cdn/logo.png');
        }
    });

    it('upload flow prepends the new asset, persists it and toasts', async () => {
        vi.mocked(uploadImage).mockResolvedValueOnce({ url: '/media/up/1.png' });
        const { result } = renderHook(() => useEditorAssets('design'));

        await result.current.handleCustomAssetUpload(new File(['x'], 'banner.png'));

        expect(uploadImage).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(result.current.customAssets).toHaveLength(1));
        expect(result.current.customAssets[0].name).toBe('banner');
        expect(JSON.parse(localStorage.getItem(CUSTOM_ASSETS_STORAGE_KEY) ?? '[]')).toHaveLength(1);
        expect(useUIStore.getState().toasts.some((t) => t.type === 'success')).toBe(true);
    });

    it('removeCustomAsset drops the asset and persists the list', async () => {
        localStorage.setItem(
            CUSTOM_ASSETS_STORAGE_KEY,
            JSON.stringify([
                { id: 'c1', name: 'a', src: 'u1' },
                { id: 'c2', name: 'b', src: 'u2' },
            ]),
        );
        const { result } = renderHook(() => useEditorAssets('design'));

        result.current.removeCustomAsset('c1');

        await waitFor(() => expect(result.current.customAssets.map((a) => a.id)).toEqual(['c2']));
        expect(JSON.parse(localStorage.getItem(CUSTOM_ASSETS_STORAGE_KEY) ?? '[]')).toHaveLength(1);
    });
});
