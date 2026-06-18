import React, { useState, useEffect } from 'react';
import { ClipDisplay, DriveFolder, ClipProject } from './ClipDisplay';

const DEFAULT_PROJECT: ClipProject = {
    id: 'default',
    youtubeLink: '',
    llmNote: '',
    selectedGroup: '',
    selectedFolder: '',
    customSubfolder: '',
    createdAt: Date.now(),
};

// ID cartella Clips Master da drive_links.json (stesso file usato dal backend)
const CLIP_MASTER_ID = '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS';

/**
 * Safely parses the response from Drive folders API, handling non-JSON responses.
 * @param res - The Response object from fetch API
 * @returns {Promise<{ ok: boolean; data?: { folders?: DriveFolder[] }; error?: string }>} 
 *   Returns ok: true with data if parsing succeeds, or ok: false with error message if parsing fails
 * @throws {SyntaxError} Catches JSON parse errors and returns them as error messages
 * @example
 * const result = await parseDriveFoldersResponse(response);
 * if (result.ok) {
 *   console.log(result.data.folders);
 * }
 */
async function parseDriveFoldersResponse(res: Response): Promise<{ ok: boolean; data?: { folders?: DriveFolder[] }; error?: string }> {
    const text = await res.text();
    try {
        const data = JSON.parse(text) as { folders?: DriveFolder[]; ok?: boolean };
        return { ok: true, data };
    } catch {
        console.warn('[CLIP] Response not JSON. Status:', res.status, 'Body preview:', text.slice(0, 80));
        return { ok: false, error: 'Risposta non valida dal server (riprova o verifica il gateway).' };
    }
}

export const ClipTabApp: React.FC = () => {
    const [projects, setProjects] = useState<ClipProject[]>([DEFAULT_PROJECT]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [clipGroups, setClipGroups] = useState<DriveFolder[]>([]);
    const [groupSubfolders, setGroupSubfolders] = useState<DriveFolder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);

    const project = projects[currentIndex] || DEFAULT_PROJECT;

    const updateProject = (updated: Partial<ClipProject>) => {
        setProjects(prev => prev.map((p, i) => i === currentIndex ? { ...p, ...updated } : p));
    };

    const addProject = () => {
        const newProject: ClipProject = {
            id: `project-${Date.now()}`,
            youtubeLink: '',
            llmNote: '',
            selectedGroup: '',
            selectedFolder: '',
            customSubfolder: '',
            createdAt: Date.now(),
        };
        setProjects(prev => [...prev, newProject]);
        setCurrentIndex(projects.length);
    };

    const removeProject = (index: number) => {
        if (projects.length <= 1) return;
        setProjects(prev => prev.filter((_, i) => i !== index));
        if (currentIndex >= index && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // Carica gruppi clip da API (stesso pattern di Stock: POST /api/drive/folders con parent_id = Clips Master da drive_links.json)
    const loadFolders = async () => {
        try {
            console.warn('[CLIP] Loading clip groups from parent:', CLIP_MASTER_ID);
            const res = await fetch('/api/drive/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: CLIP_MASTER_ID }),
            });
            const parsed = await parseDriveFoldersResponse(res);
            if (res.ok && parsed.ok && parsed.data) {
                const clipFolders = parsed.data.folders || [];
                console.warn('[CLIP] API response:', parsed.data);
                setClipGroups(clipFolders);
                setFolders(clipFolders);
                console.warn('[CLIP] Loaded clip groups:', clipFolders.map((g: DriveFolder) => g.name));
            } else if (!parsed.ok) {
                console.error('[CLIP] API parse error:', parsed.error);
            } else {
                console.error('[CLIP] API error:', res.status, res.statusText);
            }
        } catch (e) {
            console.error('[CLIP] Failed to load folders:', e);
        }
    };

    const handleGroupChange = async (groupId: string) => {
        console.warn('[CLIP] handleGroupChange called with groupId:', groupId);

        if (!groupId) {
            updateProject({ selectedGroup: '', selectedFolder: '', customSubfolder: '' });
            setGroupSubfolders([]);
            return;
        }

        const selectedGroup = clipGroups.find((g: DriveFolder) => g.id === groupId);
        console.warn('[CLIP] Selected group info:', selectedGroup);

        let subfolders = folders.filter((f: DriveFolder) => f.parentId === groupId);

        if (subfolders.length === 0) {
            console.warn('[CLIP] No subfolders in cache, fetching from API for parent:', groupId);
            try {
                const res = await fetch('/api/drive/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parent_id: groupId }),
                });
                const parsed = await parseDriveFoldersResponse(res);
                if (res.ok && parsed.ok && parsed.data) {
                    const apiFolders = parsed.data.folders || [];
                    console.warn('[CLIP] API returned subfolders:', apiFolders.map((f: DriveFolder) => f.name));
                    if (apiFolders.length > 0) {
                        setFolders(prev => {
                            const newFolders = [...prev];
                            apiFolders.forEach((folder: DriveFolder) => {
                                if (!newFolders.find(f => f.id === folder.id)) {
                                    newFolders.push(folder);
                                }
                            });
                            return newFolders;
                        });
                        subfolders = apiFolders;
                    }
                } else if (!parsed.ok) {
                    console.warn('[CLIP] Subfolders response not valid JSON:', parsed.error);
                }
            } catch (e) {
                console.error('[CLIP] Failed to fetch subfolders:', e);
            }
        }

        console.warn('[CLIP] Group subfolders for', groupId, ':', subfolders.map((f: DriveFolder) => f.name));
        setGroupSubfolders(subfolders);
        updateProject({
            selectedGroup: groupId,
            selectedFolder: groupId,
            customSubfolder: '',
        });
    };

    const handleCreateSubfolder = async () => {
        if (!newFolderName.trim() || !project.selectedGroup) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/drive/create-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parent_id: project.selectedGroup,
                    folder_name: newFolderName.trim(),
                }),
            });
            const data = await res.json();
            if (data.ok && data.folder_id) {
                const newFolder: DriveFolder = {
                    id: data.folder_id,
                    name: data.folder_name || newFolderName.trim(),
                    parentId: project.selectedGroup,
                };
                setFolders(prev => [...prev, newFolder]);
                setGroupSubfolders(prev => [...prev, newFolder]);
                updateProject({
                    selectedFolder: newFolder.id,
                    customSubfolder: newFolder.name,
                });
                setShowNewFolderInput(false);
                setNewFolderName('');
            } else if (!data.ok) {
                console.error('Create subfolder error:', data.error);
            }
        } catch (e) {
            console.error('Failed to create subfolder:', e);
        } finally {
            setIsCreating(false);
        }
    };

    const selectedGroupInfo = clipGroups.find((g: DriveFolder) => g.id === project.selectedGroup);

    const handleSubmit = async () => {
        if (!project.youtubeLink.trim() && !project.llmNote.trim()) {
            alert('Inserisci un link YouTube o una nota per il LLM');
            return;
        }

        // Feature non implementata: endpoint /api/v1/clip/process non esiste nel backend Go
        alert('Feature non disponibile: Clip processing non è ancora implementato nel backend Go.');
        return;
        
        // Codice originale rimosso:
        // setIsLoading(true);
        // try {
        //     const res = await fetch('/api/v1/clip/process', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({
        //             youtubeLink: project.youtubeLink,
        //             llmNote: project.llmNote,
        //             folderId: project.selectedFolder,
        //         }),
        //     });
        //     if (res.ok) {
        //         updateProject({ youtubeLink: '', llmNote: '' });
        //     }
        // } catch (e) {
        //     console.error('Failed to process:', e);
        // } finally {
        //     setIsLoading(false);
        // }
    };

    useEffect(() => {
        loadFolders();
    }, []);

    return (
        <ClipDisplay
            projects={projects}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            project={project}
            updateProject={updateProject}
            addProject={addProject}
            removeProject={removeProject}
            clipGroups={clipGroups}
            groupSubfolders={groupSubfolders}
            handleGroupChange={handleGroupChange}
            selectedGroupInfo={selectedGroupInfo}
            handleCreateSubfolder={handleCreateSubfolder}
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
            showNewFolderInput={showNewFolderInput}
            setShowNewFolderInput={setShowNewFolderInput}
            isCreating={isCreating}
            isLoading={isLoading}
            handleSubmit={handleSubmit}
        />
    );
};