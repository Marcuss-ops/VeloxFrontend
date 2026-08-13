// Protection network for the Drive asset client (lib/api/driveClient).
// Pins the wire contract that the assets hook and the refactored API
// facade depend on:
//   - folder_id is always sent; drive_account_id and page_token only when
//     provided
//   - the response shape (items / next_page_token / drive_account_id)
//   - content URL resolution: absolute URLs pass through, relative paths
//     are resolved against the runtime base path

import { describe, expect, it, vi } from 'vitest';
import { apiGet } from '@/lib/api/httpClient';
import { listDriveAssets, driveAssetContentUrl } from '@/lib/api/driveClient';

vi.mock('@/lib/api/httpClient', () => ({
    apiGet: vi.fn(),
}));

const driveAsset = (contentUrl: string) => ({
    id: 'a',
    name: 'a.png',
    mime_type: 'image/png',
    content_url: contentUrl,
});

describe('driveClient', () => {
    it('lists assets with only the folder id when no pagination is needed', async () => {
        vi.mocked(apiGet).mockResolvedValue({ items: [], drive_account_id: 1 });

        await listDriveAssets('folder-1');

        expect(apiGet).toHaveBeenCalledWith(
            '/api/v1/drive/assets?folder_id=folder-1',
            { cache: 'no-store' },
        );
    });

    it('passes drive_account_id and page_token to subsequent pages', async () => {
        vi.mocked(apiGet).mockResolvedValue({ items: [], drive_account_id: 1 });

        await listDriveAssets('folder-1', 7, 'page-2');

        expect(apiGet).toHaveBeenCalledWith(
            '/api/v1/drive/assets?folder_id=folder-1&drive_account_id=7&page_token=page-2',
            { cache: 'no-store' },
        );
    });

    it('returns the wire response as-is (pagination contract)', async () => {
        const wire = {
            items: [{ id: 'a', name: 'a.png', mime_type: 'image/png', content_url: '/media/a.png' }],
            next_page_token: 'page-2',
            drive_account_id: 3,
        };
        vi.mocked(apiGet).mockResolvedValue(wire);

        const response = await listDriveAssets('folder-1');

        expect(response).toBe(wire);
        expect(response.drive_account_id).toBe(3);
        expect(response.next_page_token).toBe('page-2');
    });

    it('URL-encodes the folder id', async () => {
        vi.mocked(apiGet).mockResolvedValue({ items: [], drive_account_id: 1 });

        await listDriveAssets('folder with spaces');

        expect(apiGet).toHaveBeenCalledWith(
            '/api/v1/drive/assets?folder_id=folder+with+spaces',
            { cache: 'no-store' },
        );
    });

    it('resolves absolute content URLs as-is', () => {
        expect(driveAssetContentUrl(driveAsset('https://cdn/x.png'))).toBe('https://cdn/x.png');
        expect(driveAssetContentUrl(driveAsset('data:image/png;base64,AA=='))).toBe('data:image/png;base64,AA==');
        expect(driveAssetContentUrl(driveAsset('blob:http://x'))).toBe('blob:http://x');
    });

    it('prefixes relative content URLs with the runtime base path', () => {
        expect(driveAssetContentUrl(driveAsset('/media/a.png'))).toBe('/instaeditor/media/a.png');
    });
});
