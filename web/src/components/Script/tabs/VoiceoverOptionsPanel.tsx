import React from 'react';
import type { DriveFolder, VoiceoverProject } from './voiceoverTypes';

interface VoiceoverOptionsPanelProps {
    project: VoiceoverProject;
    voiceoverGroups: DriveFolder[];
    groupSubfolders: DriveFolder[];
    selectedGroupInfo: DriveFolder | undefined;
    showNewFolderInput: boolean;
    isCreating: boolean;
    handleGroupChange: (groupId: string) => void;
    handleCreateSubfolder: () => void;
    setShowNewFolderInput: (show: boolean) => void;
    updateProject: (updated: Partial<VoiceoverProject>) => void;
}

export const VoiceoverOptionsPanel: React.FC<VoiceoverOptionsPanelProps> = ({
    project,
    voiceoverGroups,
    groupSubfolders,
    selectedGroupInfo,
    showNewFolderInput,
    isCreating,
    handleGroupChange,
    handleCreateSubfolder,
    setShowNewFolderInput,
    updateProject,
}) => {
    return (
        <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <span className="material-symbols-outlined text-emerald-400 text-xl">folder</span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Destinazione Drive</h3>
                    <p className="text-xs text-slate-500">Voiceover Master → Gruppo → Cartella Progetto</p>
                </div>
            </div>

            {/* Voiceover Master Info */}
            <div className="mb-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">cloud</span>
                    <span className="text-sm font-semibold text-emerald-300">Voiceover Master</span>
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
                        {voiceoverGroups.length === 0 ? (
                            <div className="text-xs text-slate-500 italic">Caricamento gruppi...</div>
                        ) : (
                            voiceoverGroups.map((group) => (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => handleGroupChange(group.id)}
                                    className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${
                                        project.selectedGroup === group.id
                                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                            : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                                >
                                    {group.name}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Step 2: Crea Cartella Progetto */}
                {project.selectedGroup && (
                    <div className="space-y-2 animate-fadeIn">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">create_new_folder</span>
                            2. Cartella Progetto
                        </label>

                        <div className="flex items-center gap-3">
                            {/* Dropdown sottocartelle esistenti */}
                            <select
                                value={project.selectedFolder === project.selectedGroup ? '' : project.selectedFolder}
                                onChange={(e) => {
                                    if (e.target.value === '__group__') {
                                        updateProject({ selectedFolder: project.selectedGroup, customSubfolder: '' });
                                    } else {
                                        const folder = groupSubfolders.find(f => f.id === e.target.value);
                                        updateProject({
                                            selectedFolder: e.target.value,
                                            customSubfolder: folder?.name || ''
                                        });
                                    }
                                }}
                                className="flex-1 bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-emerald-500/40 outline-none transition-all hover:border-white/20 cursor-pointer"
                            >
                                <option value="__group__">📁 {selectedGroupInfo?.name} (cartella gruppo)</option>
                                {groupSubfolders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>📁 {folder.name}</option>
                                ))}
                            </select>

                            {/* Pulsante crea cartella con nome progetto */}
                            <button
                                type="button"
                                onClick={() => setShowNewFolderInput(true)}
                                disabled={!project.projectName.trim()}
                                className="h-10 px-4 flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-xl transition-all hover:scale-105 active:scale-95 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Crea cartella con nome del progetto"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Crea &quot;{project.projectName.slice(0, 15)}{project.projectName.length > 15 ? '...' : ''}&quot;
                            </button>
                        </div>

                        {/* Create Folder Confirmation */}
                        {showNewFolderInput && (
                            <div className="flex items-center gap-3 p-4 bg-slate-950/50 rounded-xl border border-white/5 animate-fadeIn">
                                <div className="flex-1">
                                    <p className="text-sm text-slate-300 mb-1">
                                        Creare cartella: <span className="text-purple-300 font-semibold">&quot;{project.projectName}&quot;</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        in {selectedGroupInfo?.name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateSubfolder}
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? 'Creazione...' : 'Conferma'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowNewFolderInput(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-all"
                                >
                                    Annulla
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Info destinazione finale */}
                {project.selectedFolder && (
                    <div className="mt-2 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                        <p className="text-xs text-slate-400">
                            <span className="text-emerald-300 font-semibold">Destinazione:</span>{' '}
                            Voiceover Master / {selectedGroupInfo?.name}
                            {project.customSubfolder && ` / ${project.customSubfolder}`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
