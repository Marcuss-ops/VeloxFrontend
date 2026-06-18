/** StockTab types and utility functions */

export interface DriveFolder {
    id: string;
    name: string;
    link?: string;
    parentId?: string;
    language?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface StockProject {
    id: string;
    projectName: string;
    searchQuery: string;
    selectedGroup: string;
    selectedFolder: string;
    customSubfolder: string;
    clipLength: number;
    segmentLength: number;
    createdAt: number;
}

export const DEFAULT_PROJECT: StockProject = {
    id: 'default',
    projectName: '',
    searchQuery: '',
    selectedGroup: '',
    selectedFolder: '',
    customSubfolder: '',
    clipLength: 5,
    segmentLength: 25,
    createdAt: Date.now(),
};

export const CLIP_LENGTH_OPTIONS = [3, 5, 7, 10, 15, 20];
export const SEGMENT_LENGTH_OPTIONS = [10, 15, 20, 25, 30, 45, 60, 90, 120];
export const STOCK_MASTER_ID = '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh';

export type StockTabHandleChange = (groupId: string) => Promise<void>;
export type StockTabCreateSubfolder = () => Promise<void>;

/**
 * Safely parses the response from Drive folders API, handling non-JSON responses.
 */
export async function parseDriveFoldersResponse(res: Response): Promise<{ ok: boolean; data?: { folders?: DriveFolder[] }; error?: string }> {
    const text = await res.text();
    try {
        const data = JSON.parse(text) as { folders?: DriveFolder[] };
        return { ok: true, data };
    } catch {
        console.warn('[STOCK] Response not JSON. Status:', res.status, 'Body preview:', text.slice(0, 80));
        return { ok: false, error: 'Risposta non valida dal server.' };
    }
}
