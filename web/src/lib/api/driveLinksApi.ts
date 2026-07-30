import { fetchJSON, fetchVoid } from './core';
import type { DriveFile } from './driveApi';

export interface DriveLink {
  id: string;
  name: string;
  link: string;
  parentId?: string;
  language?: string;
  createdAt: number;
  updatedAt: number;
}

export const driveLinksApi = {
  /** List all Drive links */
  list: async () => {
    const data = await fetchJSON<{ success: boolean; folders: DriveLink[]; count: number }>('/api/v1/drive-links');
    return { links: data.folders || [], total: data.count || 0 };
  },

  /** Get a specific link */
  get: (linkId: string) =>
    fetchJSON<{ link: DriveLink }>(`/api/drive/links/${linkId}`),

  /** Create a new Drive link */
  create: (data: { name: string; link: string; parentId?: string; language?: string }) =>
    fetchJSON<{ ok: boolean; link: DriveLink }>('/api/drive/links', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a Drive link */
  update: (linkId: string, data: Partial<Omit<DriveLink, 'id' | 'createdAt' | 'updatedAt'>>) =>
    fetchJSON<{ ok: boolean; link: DriveLink }>(`/api/drive/links/${linkId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a Drive link */
  delete: (linkId: string) =>
    fetchVoid(`/api/drive/links/${linkId}`, { method: 'DELETE' }),

  /** Get children of a folder */
  children: (parentId: string) =>
    fetchJSON<{ links: DriveLink[] }>(`/api/drive/links?parent_id=${parentId}`),

  /** Get root folders (no parent) */
  roots: () =>
    fetchJSON<{ links: DriveLink[] }>('/api/drive/links?roots=true'),

  /**
   * List drive folders from master config (GET /api/v1/drive-links).
   * Use this to resolve folder IDs by name (e.g. VideoYoutube) for livestream/Drive integration.
   */
  listFolders: () =>
    fetchJSON<{ success: boolean; folders: Array<{ id: string; name: string; link?: string }>; count: number }>('/api/v1/drive-links'),

  /** Import videos from a Drive folder */
  importFromFolder: (folderId: string, options?: { fileType?: string; maxResults?: number }) =>
    fetchJSON<{ ok: boolean; files: DriveFile[]; imported: number }>(`/api/drive/import/${folderId}`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  /** Sync folder contents */
  syncFolder: (folderId: string) =>
    fetchJSON<{ ok: boolean; added: number; removed: number; updated: number }>(`/api/drive/links/${folderId}/sync`, {
      method: 'POST',
    }),
};
