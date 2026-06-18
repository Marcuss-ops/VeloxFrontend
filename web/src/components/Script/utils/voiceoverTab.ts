/** VoiceoverTab types and utility functions */

export interface DriveFolder {
    id: string;
    name: string;
    link?: string;
    parentId?: string;
    language?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface VoiceoverProject {
    id: string;
    projectName: string;
    text: string;
    selectedLanguages: string[];
    selectedGroup: string;
    selectedFolder: string;
    customSubfolder: string;
    createdAt: number;
}

export const DEFAULT_PROJECT: VoiceoverProject = {
    id: 'default',
    projectName: '',
    text: '',
    selectedLanguages: ['it-IT'],
    selectedGroup: '',
    selectedFolder: '',
    customSubfolder: '',
    createdAt: Date.now(),
};

export const LANGUAGES = [
    { code: 'it-IT', flag: '🇮🇹', label: 'Italiano' },
    { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
    { code: 'pt-BR', flag: '🇧🇷', label: 'Português' },
    { code: 'en-US', flag: '🇺🇸', label: 'English' },
    { code: 'fr-FR', flag: '🇫🇷', label: 'Français' },
    { code: 'ru-RU', flag: '🇷🇺', label: 'Русский' },
    { code: 'tr-TR', flag: '🇹🇷', label: 'Türkçe' },
    { code: 'de-DE', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'pl-PL', flag: '🇵🇱', label: 'Polski' },
    { code: 'id-ID', flag: '🇮🇩', label: 'Bahasa' },
];

export const VOICEOVER_MASTER_ID = '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A';

/**
 * Safely parses the response from Drive folders API, handling non-JSON responses.
 */
export async function parseDriveFoldersResponse(res: Response): Promise<{ ok: boolean; data?: { folders?: DriveFolder[] }; error?: string }> {
    const text = await res.text();
    try {
        const data = JSON.parse(text) as { folders?: DriveFolder[] };
        return { ok: true, data };
    } catch {
        console.warn('[VOICEOVER] Response not JSON. Status:', res.status, 'Body preview:', text.slice(0, 80));
        return { ok: false, error: 'Risposta non valida dal server.' };
    }
}
