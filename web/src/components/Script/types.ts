export type VideoStyle = 'normal' | 'ai-image' | 'ai-video';

export interface GroupChannel {
    id: string;
    channel: string;
    lang?: string;
    title?: string;
}

export interface TitleOverride {
    languages: string[];
    voiceover_langs?: string[];
    youtube_channel?: string;
}

export interface ClipFolders {
    initial: string[];
    inter: string[];
    final: string[];
}

export interface StockTimestamp {
    start: string;
    end: string;
    folder_id: string | null;
    folder_name: string;
    source: string;
}

export interface VideoProject {
    id?: string;
    projectName: string; // Nome del progetto
    titles: string[];
    youtubeGroup: string | null;
    videoStyle: VideoStyle;
    sourceContext: string;
    mainLanguage: string; // "it", "en", etc.
    clipFolders: ClipFolders;
    stockTimestamps: StockTimestamp[];
    voiceoverLangs: string[];
    background: string;
    music: string;
    driveFolderId?: string | null;
    voiceoverFolderId?: string | null;
    clipMainFolderId?: string | null;
    clipMainFolderName?: string | null;
    stockMainFolderId?: string | null;
    stockMainFolderName?: string | null;
    voiceoverMainFolderId?: string | null;
    voiceoverMainFolderName?: string | null;
    youtubeChannelByLang: Record<string, string>;
    titleOverrides: Record<number, TitleOverride>;
    /** Opaque InstaEdit social destination id used for Velox delivery plan. */
    externalDestinationId: string | null;
    // Stock settings
    stockClipLength: number; // Lunghezza singola clip stock in secondi (default 5)
    stockSegmentLength: number; // Lunghezza segmento totale in secondi (default 25)
    // AI Image/Video prompt
    aiPromptDescription: string; // Descrizione per generazione AI
    aiPromptStyle: string; // Stile artistico: 'medievale' | 'rinascimentale' | 'realistico' | 'art'
}

export const createDefaultVideoProject = (): VideoProject => ({
    id: undefined,
    projectName: '', // Nome del progetto
    titles: [''],
    youtubeGroup: null,
    videoStyle: 'normal',
    sourceContext: '',
    mainLanguage: 'it',
    clipFolders: { initial: [], inter: [], final: [] },
    stockTimestamps: [],
    voiceoverLangs: ['it-IT'],
    background: 'Nessuno',
    music: 'Nessuno',
    clipMainFolderId: null,
    clipMainFolderName: null,
    stockMainFolderId: null,
    stockMainFolderName: null,
    voiceoverMainFolderId: null,
    voiceoverMainFolderName: null,
    youtubeChannelByLang: {},
    titleOverrides: {},
    externalDestinationId: null,
    // Stock settings
    stockClipLength: 5, // Lunghezza singola clip stock in secondi
    stockSegmentLength: 25, // Lunghezza segmento totale in secondi
    // AI Image/Video prompt
    aiPromptDescription: '',
    aiPromptStyle: 'realistico',
});

export const DEFAULT_PROJECT: VideoProject = createDefaultVideoProject();

export interface ScriptTabState {
    projects: VideoProject[];
    currentProjectIndex: number;
    globalProgress: number;
    scriptingProgress: number;
    voiceoverProgress: number;
    logs: string[];
}
