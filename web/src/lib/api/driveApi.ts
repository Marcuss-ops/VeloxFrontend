import { fetchJSON, fetchVoid, ApiError } from './core';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  videoMediaMetadata?: {
    durationMillis?: number;
  };
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

export const driveApi = {
  /** List files in a folder (returns both files and folders) */
  files: (folderId?: string) =>
    fetchJSON<{ files: DriveFile[] }>(`/api/drive/files/list${folderId ? `?parent_id=${encodeURIComponent(folderId)}` : ''}`),

  /** Get folders only (filters files by mimeType) */
  folders: async (parentId?: string): Promise<{ folders: DriveFolder[] }> => {
    const result = await fetchJSON<{ folders: DriveFolder[] }>(`/api/drive/folders/list${parentId ? `?parent_id=${encodeURIComponent(parentId)}` : ''}`);
    return { folders: result.folders || [] };
  },

  /** Create a folder */
  createFolder: (name: string, parentId?: string) =>
    fetchJSON<{ success: boolean; folder_id: string; name: string }>('/api/drive/create-folder', {
      method: 'POST',
      body: JSON.stringify({ name, parent_id: parentId }),
    }),

  /** Upload a file */
  uploadFile: async (file: File, folderId?: string, projectName?: string): Promise<{ success: boolean; file_id?: string; web_view_link?: string; error?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', folderId);
    if (projectName) formData.append('project_name', projectName);

    const response = await fetch('/api/drive/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return response.json();
  },

  /** Download a file */
  downloadFile: (fileId: string, destPath: string) =>
    fetchJSON<{ success: boolean; path: string }>(`/api/drive/download/${fileId}?dest=${encodeURIComponent(destPath)}`),

  /** Get file link */
  getFileLink: (fileId: string) =>
    fetchJSON<{ link: string }>(`/api/drive/file/${fileId}/link`),

  /** Get accounts */
  accounts: () =>
    fetchJSON<{ accounts: Array<{ name: string; email: string; created_at: string; expires_at: string }> }>('/api/drive/accounts'),

  /** Set active account */
  setAccount: (name: string) =>
    fetchJSON<{ success: boolean; account: string }>(`/api/drive/accounts/${encodeURIComponent(name)}/use`, { method: 'POST' }),

  /** Delete account */
  deleteAccount: (name: string) =>
    fetchVoid(`/api/drive/accounts/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /** Get OAuth URL and open in new window */
  startOAuth: async (): Promise<string | null> => {
    const data = await fetchJSON<{ auth_url: string; state: string }>('/api/drive/oauth/start');
    if (data?.auth_url) {
      window.open(data.auth_url, '_blank', 'noopener,noreferrer');
      return data.auth_url;
    }
    return null;
  },

  /** Stage a Drive file for upload by downloading to server temp path */
  stageDownload: async (fileId: string, destPath?: string): Promise<string> => {
    const safeName = destPath || `/tmp/velox_uploads/${Date.now()}_${fileId}`;
    // This endpoint returns success/failure, uses fetchJSON for error handling
    await fetchJSON<{ success: boolean; path: string }>(`/api/drive/download/${encodeURIComponent(fileId)}?dest=${encodeURIComponent(safeName)}`);
    return safeName;
  },

  /** Get about info */
  about: () =>
    fetchJSON('/api/drive/about'),

  /** Get media URL for a file */
  mediaUrl: (fileId: string) => `/api/drive/media/${fileId}`,
};


export const driveApiExtended = {
  /** Read txt file content */
  readTxt: (fileId: string) =>
    fetchJSON<{ content: string }>('/api/drive/read-txt', {
      method: 'POST',
      body: JSON.stringify({ file_id: fileId }),
    }),
};
