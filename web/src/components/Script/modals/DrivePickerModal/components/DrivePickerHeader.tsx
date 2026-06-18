import React from 'react';

interface FolderNode {
    id: string;
    name: string;
}

interface DrivePickerHeaderProps {
    title: string;
    mode: 'clip' | 'stock' | 'voiceover';
    currentFolderName: string;
    path: FolderNode[];
    searchTerm: string;
    fileTypeFilter: 'all' | 'video' | 'txt';
    sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';
    selectedClipIds: Set<string>;
    currentFolderId: string | null;
    onClose: () => void;
    onSelectFolder: (folder: { id: string; name: string }) => void;
    addSelectedClips: () => void;
    loadFolder: (folderId: string, nextPath: FolderNode[]) => void;
    setSearchTerm: (val: string) => void;
    setFileTypeFilter: (val: 'all' | 'video' | 'txt') => void;
    setSortBy: (val: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc') => void;
}

export const DrivePickerHeader: React.FC<DrivePickerHeaderProps> = ({
    title,
    mode,
    currentFolderName,
    path,
    searchTerm,
    fileTypeFilter,
    sortBy,
    selectedClipIds,
    currentFolderId,
    onClose,
    onSelectFolder,
    addSelectedClips,
    loadFolder,
    setSearchTerm,
    setFileTypeFilter,
    setSortBy,
}) => {
    return (
        <>
            {/* Title bar */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                    <div className="text-sm font-bold text-white">{title}</div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                        Modalità: {mode} • {currentFolderName}
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Breadcrumb + action buttons */}
            <div className="px-5 py-3 border-b border-white/10 flex flex-wrap items-center gap-2">
                {path.map((p, i) => (
                    <button
                        key={`${p.id}-${i}`}
                        onClick={() => loadFolder(p.id, path.slice(0, i + 1))}
                        className="text-[11px] px-2 py-1 rounded bg-slate-800/70 border border-white/10 text-slate-300 hover:text-white"
                    >
                        {p.name}
                    </button>
                ))}
                <button
                    onClick={() => {
                        if (currentFolderId) onSelectFolder({ id: currentFolderId, name: currentFolderName });
                    }}
                    className="ml-auto text-[11px] px-3 py-1.5 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
                >
                    Seleziona questa cartella
                </button>
                {mode === 'clip' && (
                    <button
                        onClick={addSelectedClips}
                        disabled={selectedClipIds.size === 0}
                        className="text-[11px] px-3 py-1.5 rounded bg-violet-600/20 border border-violet-500/40 text-violet-200 hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Aggiungi selezionate ({selectedClipIds.size})
                    </button>
                )}
            </div>

            {/* Search + filters */}
            <div className="px-5 py-3 border-b border-white/10 grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ricerca live file/cartelle..."
                    className="md:col-span-2 bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-sky-500/40"
                />
                <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value as 'all' | 'video' | 'txt')}
                    className="bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500/40"
                >
                    <option value="all">Tutti i file</option>
                    <option value="video">Solo video</option>
                    <option value="txt">Solo TXT</option>
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc')}
                    className="bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500/40"
                >
                    <option value="date_desc">Data: recenti</option>
                    <option value="date_asc">Data: vecchi</option>
                    <option value="name_asc">Nome: A-Z</option>
                    <option value="name_desc">Nome: Z-A</option>
                </select>
            </div>
        </>
    );
};