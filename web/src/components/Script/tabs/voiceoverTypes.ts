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
