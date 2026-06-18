import React from 'react';

// ----- Shared Types -----

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

// ----- Props -----

interface ClipDisplayProps {
    projects: ClipProject[];
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    project: ClipProject;
    updateProject: (updated: Partial<ClipProject>) => void;
    addProject: () => void;
    removeProject: (index: number) => void;
    clipGroups: DriveFolder[];
    groupSubfolders: DriveFolder[];
    handleGroupChange: (groupId: string) => void;
    selectedGroupInfo: DriveFolder | undefined;
    handleCreateSubfolder: () => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    showNewFolderInput: boolean;
    setShowNewFolderInput: (show: boolean) => void;
    isCreating: boolean;
    isLoading: boolean;
    handleSubmit: () => void;
}

// ----- Component -----

export const ClipDisplay: React.FC<ClipDisplayProps> = ({
    projects,
    currentIndex,
    setCurrentIndex,
    project,
    updateProject,
    addProject,
    removeProject,
    clipGroups,
    groupSubfolders,
    handleGroupChange,
    selectedGroupInfo,
    handleCreateSubfolder,
    newFolderName,
    setNewFolderName,
    showNewFolderInput,
    setShowNewFolderInput,
    isCreating,
    isLoading,
    handleSubmit,
}) => {
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
                                    ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span className="text-xs font-bold uppercase tracking-wide">
                                {proj.youtubeLink ? proj.youtubeLink.slice(0, 20) + '...' : 'Nuovo Progetto'}
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

                {/* YouTube Link Section */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                            <span className="material-symbols-outlined text-red-400 text-xl">video_library</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Link Video</h3>
                            <p className="text-xs text-slate-500">Inserisci il link del video da cui scaricare clip</p>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={project.youtubeLink}
                            onChange={(e) => updateProject({ youtubeLink: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-red-500/40 outline-none resize-none transition-all hover:border-white/20"
                        />
                    </div>
                </div>

                {/* LLM Note Section */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <span className="material-symbols-outlined text-purple-400 text-xl">psychology</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Nota per LLM</h3>
                            <p className="text-xs text-slate-500">Descrizione di quali clip cercare o timestamp specifici</p>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            value={project.llmNote}
                            onChange={(e) => updateProject({ llmNote: e.target.value })}
                            placeholder="Es: 'Cerca clip di lutte dalla 2:30 alla 5:00' oppure 'Timestamp: 0:45-1:20, 3:10-4:00'..."
                            rows={4}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500/40 outline-none resize-none transition-all hover:border-white/20 custom-scrollbar"
                        />
                    </div>
                </div>

                {/* Drive Folder Selection */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <span className="material-symbols-outlined text-emerald-400 text-xl">folder</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Destinazione Drive</h3>
                            <p className="text-xs text-slate-500">Clips Master → Gruppo → Sottocartella (da drive_links.json)</p>
                        </div>
                    </div>

                    <div className="mb-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-400 text-lg">cloud</span>
                            <span className="text-sm font-semibold text-emerald-300">Clips Master</span>
                            <span className="text-xs text-slate-500">/</span>
                            {selectedGroupInfo && (
                                <>
                                    <span className="text-sm font-semibold text-red-300">{selectedGroupInfo.name}</span>
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
                                {clipGroups.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic">Caricamento gruppi...</div>
                                ) : (
                                    clipGroups.map((group) => (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => handleGroupChange(group.id)}
                                            className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${
                                                project.selectedGroup === group.id
                                                    ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            {group.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Step 2: Seleziona Destinazione */}
                        {project.selectedGroup && (
                            <div className="space-y-3 animate-fadeIn">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">create_new_folder</span>
                                    2. Seleziona Destinazione
                                </label>

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
                                                        customSubfolder: folder.name,
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

                        {project.selectedFolder && (
                            <div className="mt-2 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                                <p className="text-xs text-slate-400">
                                    <span className="text-emerald-300 font-semibold">Destinazione:</span>{' '}
                                    Clips Master / {selectedGroupInfo?.name}
                                    {project.customSubfolder && ` / ${project.customSubfolder}`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-4 z-40">
                    <div className="glass-panel rounded-2xl border border-white/10 p-4 shadow-2xl flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold shadow-lg border border-red-400/20 transition-all transform hover:scale-[1.02] ${
                                isLoading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-900/20'
                            }`}
                        >
                            <span className="material-symbols-outlined">arrow_downward</span>
                            {isLoading ? 'Elaborazione...' : 'Invia'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};