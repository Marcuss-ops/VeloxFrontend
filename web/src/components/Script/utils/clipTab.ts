/** ClipTab types, constants, and utilities */

export interface DriveFolder {
    id: string;
    name: string;
    link?: string;
    parentId?: string;
    language?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface ClipProject {
    id: string;
    youtubeLink: string;
    llmNote: string;
    selectedGroup: string;
    selectedFolder: string;
    customSubfolder: string;
    createdAt: number;
}

export const DEFAULT_PROJECT: ClipProject = {
    id: 'default',
    youtubeLink: '',
    llmNote: '',
    selectedGroup: '',
    selectedFolder: '',
    customSubfolder: '',
    createdAt: Date.now(),
};

/** ID cartella Clips Master da drive_links.json (stesso file usato dal backend) */
export const CLIP_MASTER_ID = '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS';

/**
 * Safely parses the response from Drive folders API, handling non-JSON responses.
 */
export async function parseDriveFoldersResponse(res: Response): Promise<{ ok: boolean; data?: { folders?: DriveFolder[] }; error?: string }> {
    const text = await res.text();
    try {
        const data = JSON.parse(text) as { folders?: DriveFolder[]; ok?: boolean };
        return { ok: true, data };
    } catch {
        console.warn('[CLIP] Response not JSON. Status:', res.status, 'Body preview:', text.slice(0, 80));
        return { ok: false, error: 'Risposta non valida dal server (riprova o verifica il gateway).' };
    }
}

export function createDefaultProject(): ClipProject {
    return {
        id: `project-${Date.now()}`,
        youtubeLink: '',
        llmNote: '',
        selectedGroup: '',
        selectedFolder: '',
        customSubfolder: '',
        createdAt: Date.now(),
    };
}
