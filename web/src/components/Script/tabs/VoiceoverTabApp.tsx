import React, { useState, useEffect } from 'react';
import { VoiceoverConfigPanel, LANGUAGES } from './VoiceoverConfigPanel';
import { VoiceoverOptionsPanel } from './VoiceoverOptionsPanel';

import type { DriveFolder, VoiceoverProject } from './voiceoverTypes';

const DEFAULT_PROJECT: VoiceoverProject = {
    id: 'default',
    projectName: '',
    text: '',
    selectedLanguages: ['it-IT'],
    selectedGroup: '',
    selectedFolder: '',
    customSubfolder: '',
    createdAt: Date.now(),
};

// ID della cartella Voiceover Master
const VOICEOVER_MASTER_ID = '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A';

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
        const data = JSON.parse(text) as { folders?: DriveFolder[] };
        return { ok: true, data };
    } catch {
        console.warn('[VOICEOVER] Response not JSON. Status:', res.status, 'Body preview:', text.slice(0, 80));
        return { ok: false, error: 'Risposta non valida dal server.' };
    }
}

export const VoiceoverTabApp: React.FC = () => {
    const [projects, setProjects] = useState<VoiceoverProject[]>([DEFAULT_PROJECT]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [voiceoverGroups, setVoiceoverGroups] = useState<DriveFolder[]>([]); // Gruppi caricati dall'API
    const [groupSubfolders, setGroupSubfolders] = useState<DriveFolder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);

    const project = projects[currentIndex] || DEFAULT_PROJECT;

    const updateProject = (updated: Partial<VoiceoverProject>) => {
        setProjects(prev => prev.map((p, i) => i === currentIndex ? { ...p, ...updated } : p));
    };

    const addProject = () => {
        const newProject: VoiceoverProject = {
            id: `project-${Date.now()}`,
            projectName: '',
            text: '',
            selectedLanguages: ['it-IT'],
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

    const toggleLanguage = (code: string) => {
        const current = project.selectedLanguages || ['it-IT'];
        const updated = current.includes(code)
            ? current.filter(l => l !== code)
            : [...current, code];
        updateProject({ selectedLanguages: updated.length > 0 ? updated : ['it-IT'] });
    };

    const selectAllLanguages = () => {
        updateProject({ selectedLanguages: LANGUAGES.map(l => l.code) });
    };

    // Load folders from API - POST /api/drive/folders with parent_id
    const loadFolders = async () => {
        try {
            // Carica i gruppi voiceover direttamente dalla cartella Voiceover Master
            console.warn('[VOICEOVER] Loading voiceover groups from parent:', VOICEOVER_MASTER_ID);
            const res = await fetch('/api/drive/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: VOICEOVER_MASTER_ID }),
            });
            if (res.ok) {
                const data = await res.json();
                console.warn('[VOICEOVER] API response:', data);
                const voiceoverFolders = data.folders || [];
                
                // Queste sono le sottocartelle di Voiceover Master = gruppi
                setVoiceoverGroups(voiceoverFolders);
                setFolders(voiceoverFolders);
                
                console.warn('[VOICEOVER] Loaded voiceover groups:', voiceoverFolders.map((g: DriveFolder) => g.name));
            } else {
                console.error('[VOICEOVER] API error:', res.status, res.statusText);
            }
        } catch (e) {
            console.error('[VOICEOVER] Failed to load folders:', e);
        }
    };

    // Handle group selection change - con caricamento sottocartelle da API (POST)
    const handleGroupChange = async (groupId: string) => {
        if (!groupId) {
            updateProject({ 
                selectedGroup: '', 
                selectedFolder: '',
                customSubfolder: ''
            });
            setGroupSubfolders([]);
            return;
        }
        
        // Prima cerca nelle cartelle già caricate
        let subfolders = folders.filter((f: DriveFolder) => f.parentId === groupId);
        
        // Se non trova sottocartelle, prova a caricarle dall'API specifica (POST)
        if (subfolders.length === 0) {
            console.warn('[VOICEOVER] No subfolders in cache, fetching from API for parent:', groupId);
            try {
                const res = await fetch('/api/drive/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parent_id: groupId }),
                });
                const parsed = await parseDriveFoldersResponse(res);
                if (res.ok && parsed.ok && parsed.data) {
                    const apiFolders = parsed.data.folders || [];
                    console.warn('[VOICEOVER] API returned subfolders:', apiFolders.map((f: DriveFolder) => f.name));
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
                    console.warn('[VOICEOVER] Subfolders response not valid JSON:', parsed.error);
                }
            } catch (e) {
                console.error('[VOICEOVER] Failed to fetch subfolders:', e);
            }
        }
        
        console.warn('[VOICEOVER] Group subfolders for', groupId, ':', subfolders.map((f: DriveFolder) => f.name));
        setGroupSubfolders(subfolders);

        updateProject({ 
            selectedGroup: groupId, 
            selectedFolder: groupId, // Default to group folder
            customSubfolder: ''
        });
    };

    // Create new subfolder with project name
    const handleCreateSubfolder = async () => {
        if (!project.projectName.trim() || !project.selectedGroup) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/drive/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: project.projectName, // Usa il nome del progetto come nome cartella
                    parentId: project.selectedGroup // Create inside selected group
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const newFolder = data.folder;
                
                // Add to folders list
                setFolders(prev => [...prev, newFolder]);
                
                // Add to group subfolders
                setGroupSubfolders(prev => [...prev, newFolder]);
                
                // Select the new folder
                updateProject({ 
                    selectedFolder: newFolder.id,
                    customSubfolder: project.projectName
                });
                setShowNewFolderInput(false);
            }
        } catch (e) {
            console.error('Failed to create subfolder:', e);
        } finally {
            setIsCreating(false);
        }
    };

    // Get selected group info
    const selectedGroupInfo = voiceoverGroups.find(g => g.id === project.selectedGroup);

    // Submit
    const handleSubmit = async () => {
        if (!project.text.trim()) {
            alert('Inserisci il testo per il voiceover');
            return;
        }

        // Feature non implementata: endpoint /api/v1/voiceover/generate non esiste nel backend Go
        alert('Feature non disponibile: Voiceover generation non è ancora implementata nel backend Go.');
    };

    useEffect(() => {
        loadFolders();
    }, []);

    return (
        <div className="relative w-full max-w-7xl mx-auto animate-fadeIn px-4 py-6">
            <div className="flex flex-col gap-6">

                {/* Project Queue */}
                <div className="flex items-center gap-2 flex-wrap">
                    {projects.map((proj, index) => (
                        <button
                            key={proj.id}
                            onClick={() => setCurrentIndex(index)}
                            className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                                index === currentIndex
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">graphic_eq</span>
                            <span className="text-xs font-bold uppercase tracking-wide">
                                {proj.projectName || (proj.text ? proj.text.slice(0, 20) + '...' : 'Nuovo Progetto')}
                            </span>
                            {projects.length > 1 && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeProject(index);
                                    }}
                                    className="ml-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-xs">close</span>
                                </span>
                            )}
                        </button>
                    ))}
                    <button
                        onClick={addProject}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 text-slate-500 hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-xs font-bold uppercase tracking-wide">Nuovo</span>
                    </button>
                </div>

                {/* Project Name */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <span className="material-symbols-outlined text-purple-400 text-xl">label</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Nome Progetto</h3>
                            <p className="text-xs text-slate-500">Usato come nome della cartella Drive</p>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={project.projectName}
                        onChange={(e) => updateProject({ projectName: e.target.value })}
                        placeholder="Es: Video WWE Promo Italiano..."
                        className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500/40 outline-none transition-all hover:border-white/20"
                    />
                </div>

                {/* Text Section */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <span className="material-symbols-outlined text-purple-400 text-xl">description</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Testo Voiceover</h3>
                            <p className="text-xs text-slate-500">Inserisci il testo da convertire in audio</p>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            value={project.text}
                            onChange={(e) => updateProject({ text: e.target.value })}
                            placeholder="Inserisci qui il testo per il voiceover..."
                            rows={6}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500/40 outline-none resize-none transition-all hover:border-white/20 custom-scrollbar"
                        />
                    </div>
                </div>

                {/* Language Selection - extracted to VoiceoverConfigPanel */}
                <VoiceoverConfigPanel
                    selectedLanguages={project.selectedLanguages}
                    toggleLanguage={toggleLanguage}
                    selectAllLanguages={selectAllLanguages}
                />

                {/* Drive Folder Selection - extracted to VoiceoverOptionsPanel */}
                <VoiceoverOptionsPanel
                    project={project}
                    voiceoverGroups={voiceoverGroups}
                    groupSubfolders={groupSubfolders}
                    selectedGroupInfo={selectedGroupInfo}
                    showNewFolderInput={showNewFolderInput}
                    isCreating={isCreating}
                    handleGroupChange={handleGroupChange}
                    handleCreateSubfolder={handleCreateSubfolder}
                    setShowNewFolderInput={setShowNewFolderInput}
                    updateProject={updateProject}
                />

                {/* Submit Button */}
                <div className="sticky bottom-4 z-40">
                    <div className="glass-panel rounded-2xl border border-white/10 p-4 shadow-2xl flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold shadow-lg border border-purple-400/20 transition-all transform hover:scale-[1.02] ${
                                isLoading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/20'
                            }`}
                        >
                            <span className="material-symbols-outlined">graphic_eq</span>
                            {isLoading ? 'Generazione...' : 'Genera Voiceover'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};