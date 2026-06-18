import React, { useState } from 'react';
import { StockSearchPanel } from './StockSearchPanel';
import { StockFilters } from './StockFilters';

interface DriveFolder {
    id: string;
    name: string;
    link?: string;
    parentId?: string;
    language?: string;
    createdAt?: number;
    updatedAt?: number;
}

interface StockProject {
    id: string;
    projectName: string; // Nome del progetto
    searchQuery: string;
    selectedGroup: string; // Gruppo selezionato (es. wwe, hiphop, discovery)
    selectedFolder: string; // Cartella di destinazione (può essere gruppo o sottocartella creata)
    customSubfolder: string; // Nome sottocartella personalizzata (se creata)
    clipLength: number; // Lunghezza singola clip in secondi (default 5)
    segmentLength: number; // Lunghezza segmento totale in secondi (default 25)
    createdAt: number;
}

const DEFAULT_PROJECT: StockProject = {
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

// ID della cartella Stock Master
const STOCK_MASTER_ID = '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh';

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
        console.warn('[STOCK] Response not JSON. Status:', res.status, 'Body preview:', text.slice(0, 80));
        return { ok: false, error: 'Risposta non valida dal server.' };
    }
}

export const StockTabApp: React.FC = () => {
    const [projects, setProjects] = useState<StockProject[]>([DEFAULT_PROJECT]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [stockGroups, setStockGroups] = useState<DriveFolder[]>([]); // Gruppi caricati dall'API (sottocartelle di Stock Master)
    const [groupSubfolders, setGroupSubfolders] = useState<DriveFolder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);

    const project = projects[currentIndex] || DEFAULT_PROJECT;

    const updateProject = (updated: Partial<StockProject>) => {
        setProjects(prev => prev.map((p, i) => i === currentIndex ? { ...p, ...updated } : p));
    };

    const addProject = () => {
        const newProject: StockProject = {
            id: `project-${Date.now()}`,
            projectName: '',
            searchQuery: '',
            selectedGroup: '',
            selectedFolder: '',
            customSubfolder: '',
            clipLength: 5,
            segmentLength: 25,
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

    // Load folders from API - POST /api/drive/folders with parent_id
    const loadFolders = async () => {
        try {
            // Carica i gruppi stock direttamente dalla cartella Stock Master
            console.warn('[STOCK] Loading stock groups from parent:', STOCK_MASTER_ID);
            const res = await fetch('/api/drive/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: STOCK_MASTER_ID }),
            });
            if (res.ok) {
                const data = await res.json();
                console.warn('[STOCK] API response:', data);
                const stockFolders = data.folders || [];
                
                // Queste sono le sottocartelle di Stock Master = gruppi
                setStockGroups(stockFolders);
                setFolders(stockFolders);
                
                console.warn('[STOCK] Loaded stock groups:', stockFolders.map((g: DriveFolder) => g.name));
            } else {
                console.error('[STOCK] API error:', res.status, res.statusText);
            }
        } catch (e) {
            console.error('[STOCK] Failed to load folders:', e);
        }
    };

    // Handle group selection change - con caricamento sottocartelle da API (POST)
    const handleGroupChange = async (groupId: string) => {
        console.warn('[STOCK] handleGroupChange called with groupId:', groupId);
        
        if (!groupId) {
            updateProject({ 
                selectedGroup: '', 
                selectedFolder: '',
                customSubfolder: ''
            });
            setGroupSubfolders([]);
            return;
        }
        
        // Trova info gruppo selezionato
        const selectedGroup = stockGroups.find((g: DriveFolder) => g.id === groupId);
        console.warn('[STOCK] Selected group info:', selectedGroup);
        
        // (Gruppi Drive: ora gestiti via /api/drive/groups + /api/drive/folders)
        
        // Prima cerca nelle cartelle già caricate
        let subfolders = folders.filter((f: DriveFolder) => f.parentId === groupId);
        
        // Se non trova sottocartelle, prova a caricarle dall'API specifica (POST)
        if (subfolders.length === 0) {
            console.warn('[STOCK] No subfolders in cache, fetching from API for parent:', groupId);
            try {
                const res = await fetch('/api/drive/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parent_id: groupId }),
                });
                const parsed = await parseDriveFoldersResponse(res);
                if (res.ok && parsed.ok && parsed.data) {
                    const apiFolders = parsed.data.folders || [];
                    console.warn('[STOCK] API returned subfolders:', apiFolders.map((f: DriveFolder) => f.name));
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
                    console.warn('[STOCK] Subfolders response not valid JSON:', parsed.error);
                }
            } catch (e) {
                console.error('[STOCK] Failed to fetch subfolders:', e);
            }
        }
        
        console.warn('[STOCK] Group subfolders for', groupId, ':', subfolders.map((f: DriveFolder) => f.name));
        setGroupSubfolders(subfolders);

        updateProject({ 
            selectedGroup: groupId, 
            selectedFolder: groupId, // Default to group folder
            customSubfolder: ''
        });
    };

    // Create new subfolder inside selected group
    const handleCreateSubfolder = async () => {
        if (!newFolderName.trim() || !project.selectedGroup) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/drive/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newFolderName,
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
                    customSubfolder: newFolderName
                });
                setShowNewFolderInput(false);
                setNewFolderName('');
            }
        } catch (e) {
            console.error('Failed to create subfolder:', e);
        } finally {
            setIsCreating(false);
        }
    };

    // Get selected group info from dynamically loaded groups
    const selectedGroupInfo = stockGroups.find((g: DriveFolder) => g.id === project.selectedGroup);

    // Submit
    const handleSubmit = async () => {
        if (!project.searchQuery.trim()) {
            alert('Inserisci una query di ricerca');
            return;
        }

        // Feature non implementata: endpoint /api/v1/stock/search non esiste nel backend Go
        alert('Feature non disponibile: Stock search non è ancora implementato nel backend Go.');
        return;
        
        // Codice originale rimosso:
        // setIsLoading(true);
        // try {
        //     const res = await fetch('/api/v1/stock/search', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({
        //             projectName: project.projectName,
        //             searchQuery: project.searchQuery,
        //             folderId: project.selectedFolder,
        //             clipLength: project.clipLength,
        //             segmentLength: project.segmentLength,
        //         }),
        //     });
        //     if (res.ok) {
        //         // Success feedback
        //         updateProject({ searchQuery: '' });
        //     }
        // } catch (e) {
        //     console.error('Failed to search:', e);
        // } finally {
        //     setIsLoading(false);
        // }
    };

    React.useEffect(() => {
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
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">movie</span>
                            <span className="text-xs font-bold uppercase tracking-wide">
                                {proj.projectName || (proj.searchQuery ? proj.searchQuery.slice(0, 20) + '...' : 'Nuovo Progetto')}
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
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 text-slate-500 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-xs font-bold uppercase tracking-wide">Nuovo</span>
                    </button>
                </div>

                {/* Project Settings - Nome Progetto e Dropdown */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                            <span className="material-symbols-outlined text-sky-400 text-xl">tune</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Impostazioni Progetto</h3>
                            <p className="text-xs text-slate-500">Configura nome e parametri clip</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Nome Progetto */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">label</span>
                                Nome Progetto
                            </label>
                            <input
                                type="text"
                                value={project.projectName}
                                onChange={(e) => updateProject({ projectName: e.target.value })}
                                placeholder="Es: Video WWE Promo..."
                                className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all hover:border-white/20"
                            />
                        </div>

                        <StockFilters
                            clipLength={project.clipLength}
                            onClipLengthChange={(value) => updateProject({ clipLength: value })}
                            segmentLength={project.segmentLength}
                            onSegmentLengthChange={(value) => updateProject({ segmentLength: value })}
                        />
                    </div>
                </div>

                <StockSearchPanel
                    searchQuery={project.searchQuery}
                    onSearchChange={(value) => updateProject({ searchQuery: value })}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                />

                {/* Drive Folder Selection - Gerarchia Stock Master > Gruppo > Sottocartella */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <span className="material-symbols-outlined text-emerald-400 text-xl">folder</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Destinazione Drive</h3>
                            <p className="text-xs text-slate-500">Stock Master → Gruppo → Sottocartella</p>
                        </div>
                    </div>

                    {/* Stock Master Info */}
                    <div className="mb-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-400 text-lg">cloud</span>
                            <span className="text-sm font-semibold text-emerald-300">Stock Master</span>
                            <span className="text-xs text-slate-500">/</span>
                            {selectedGroupInfo && (
                                <>
                                    <span className="text-sm font-semibold text-amber-300">{selectedGroupInfo.name}</span>
                                    {project.customSubfolder && (
                                        <>
                                            <span className="text-xs text-slate-500">/</span>
                                            <span className="text-sm font-semibold text-sky-300">{project.customSubfolder}</span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        {/* Step 1: Seleziona Gruppo */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">folder_open</span>
                                1. Seleziona Gruppo
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {stockGroups.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic">Caricamento gruppi...</div>
                                ) : (
                                    stockGroups.map((group) => (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => handleGroupChange(group.id)}
                                            className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${
                                                project.selectedGroup === group.id
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            {group.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Step 2: Seleziona Sottocartella (visive come bottoni) */}
                        {project.selectedGroup && (
                            <div className="space-y-3 animate-fadeIn">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">create_new_folder</span>
                                    2. Seleziona Destinazione
                                </label>
                                
                                {/* Cartella Gruppo (root del gruppo) */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateProject({ selectedFolder: project.selectedGroup, customSubfolder: '' })}
                                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                                            project.selectedFolder === project.selectedGroup
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">folder</span>
                                        {selectedGroupInfo?.name} (root)
                                    </button>
                                </div>

                                {/* Sottocartelle esistenti */}
                                {groupSubfolders.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Sottocartelle esistenti:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {groupSubfolders.map((folder) => (
                                                <button
                                                    key={folder.id}
                                                    type="button"
                                                    onClick={() => updateProject({ 
                                                        selectedFolder: folder.id, 
                                                        customSubfolder: folder.name 
                                                    })}
                                                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
                                                        project.selectedFolder === folder.id
                                                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                                                            : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-sm">folder_open</span>
                                                    {folder.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Crea nuova sottocartella */}
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    {!showNewFolderInput ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowNewFolderInput(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs font-semibold"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                            Crea Nuova Sottocartella
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-white/5 animate-fadeIn">
                                            <input
                                                type="text"
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                placeholder={`Nome sottocartella in ${selectedGroupInfo?.name}...`}
                                                className="flex-1 bg-slate-900/70 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-500/40 outline-none"
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubfolder()}
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateSubfolder}
                                                disabled={isCreating || !newFolderName.trim()}
                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isCreating ? 'Creazione...' : 'Crea'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowNewFolderInput(false);
                                                    setNewFolderName('');
                                                }}
                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-all"
                                            >
                                                Annulla
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Info destinazione finale */}
                        {project.selectedFolder && (
                            <div className="mt-2 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                                <p className="text-xs text-slate-400">
                                    <span className="text-emerald-300 font-semibold">Destinazione:</span>{' '}
                                    Stock Master / {selectedGroupInfo?.name}
                                    {project.customSubfolder && ` / ${project.customSubfolder}`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
