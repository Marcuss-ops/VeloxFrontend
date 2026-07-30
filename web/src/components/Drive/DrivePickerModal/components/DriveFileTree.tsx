import React, { Dispatch, SetStateAction } from 'react';

interface DriveEntry {
    id: string;
    name: string;
    mimeType?: string;
    type?: 'folder' | 'file';
    modifiedTime?: string;
    createdTime?: string;
    webViewLink?: string;
    thumbnailLink?: string;
}

interface FolderNode {
    id: string;
    name: string;
}

interface DriveFileTreeProps {
    loading: boolean;
    error: string | null;
    mode: 'clip' | 'stock' | 'voiceover';
    filteredFolders: DriveEntry[];
    filteredFiles: DriveEntry[];
    clipFiles: DriveEntry[];
    txtFiles: DriveEntry[];
    genericFiles: DriveEntry[];
    path: FolderNode[];
    selectedClipIds: Set<string>;
    activePreviewId: string | null;
    previewClip: { id: string; name: string } | null;
    durationById: Record<string, string>;
    txtViewer: { loading: boolean; name: string; content: string; error: string | null };
    fileTypeFilter: 'all' | 'video' | 'txt';
    onSelectFolder: (folder: { id: string; name: string }) => void;
    onSelectClip?: (clip: { id: string; name: string; url: string }) => void;
    loadFolder: (folderId: string, nextPath: FolderNode[]) => void;
    toggleClipSelection: (clipId: string) => void;
    buildClipPayload: (f: DriveEntry) => { id: string; name: string; url: string };
    openTxtFile: (file: DriveEntry) => void;
    startClipPreviewHover: (clip: DriveEntry) => void;
    clearClipPreviewHover: () => void;
    formatDateTime: (raw?: string) => string;
    formatDuration: (secs: number | undefined) => string;
    setDurationById: Dispatch<SetStateAction<Record<string, string>>>;
}

export const DriveFileTree: React.FC<DriveFileTreeProps> = ({
    loading,
    error,
    mode,
    filteredFolders,
    filteredFiles,
    clipFiles,
    txtFiles,
    genericFiles,
    path,
    selectedClipIds,
    activePreviewId,
    previewClip,
    durationById,
    txtViewer,
    fileTypeFilter,
    onSelectFolder,
    onSelectClip,
    loadFolder,
    toggleClipSelection,
    buildClipPayload,
    openTxtFile,
    startClipPreviewHover,
    clearClipPreviewHover,
    formatDateTime,
    formatDuration,
    setDurationById,
}) => {
    return (
        <div className="p-5 overflow-auto max-h-[60vh]">
            {loading && <div className="text-sm text-slate-400">Caricamento cartelle...</div>}
            {error && <div className="text-sm text-red-400">{error}</div>}
            {!loading && !error && (
                <div className="space-y-5">
                    {/* Folders section */}
                    <div>
                        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Cartelle</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {filteredFolders.map((f) => (
                                <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-white/10">
                                    <button
                                        onClick={() => loadFolder(f.id, [...path, { id: f.id, name: f.name }])}
                                        className="text-slate-300 hover:text-white"
                                        title="Apri cartella"
                                    >
                                        <span className="material-symbols-outlined">folder_open</span>
                                    </button>
                                    <div className="flex-1 text-sm text-slate-200 truncate">{f.name}</div>
                                    <button
                                        onClick={() => onSelectFolder({ id: f.id, name: f.name })}
                                        className="text-[11px] px-2 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30"
                                    >
                                        Seleziona
                                    </button>
                                </div>
                            ))}
                            {filteredFolders.length === 0 && <div className="text-xs text-slate-500">Nessuna sottocartella trovata.</div>}
                        </div>
                    </div>

                    {/* Files section */}
                    <div>
                        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">File nella cartella ({filteredFiles.length})</div>
                        <div className="space-y-1">
                            {mode === 'clip' && clipFiles.length > 0 && (
                                <div className="space-y-1 mb-3">
                                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">Clip selezionabili</div>
                                    {clipFiles.slice(0, 60).map((f) => (
                                        <div
                                            key={f.id}
                                            onMouseEnter={() => startClipPreviewHover(f)}
                                            onMouseLeave={clearClipPreviewHover}
                                            className="group flex items-center gap-3 p-2 rounded-xl bg-slate-950/60 border border-white/10 hover:border-violet-400/40"
                                        >
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClipIds.has(f.id)}
                                                    onChange={() => toggleClipSelection(f.id)}
                                                    className="w-4 h-4 rounded border-white/20 bg-slate-900 text-violet-500"
                                                />
                                            </label>
                                            <div className="relative w-28 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/50 shrink-0">
                                                {activePreviewId === f.id ? (
                                                    <video
                                                        src={`/api/drive/media/${f.id}`}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        autoPlay
                                                        loop
                                                        playsInline
                                                        onLoadedMetadata={(ev) => {
                                                            const secs = (ev.currentTarget as HTMLVideoElement).duration;
                                                            setDurationById((prev) => ({ ...prev, [f.id]: formatDuration(secs) }));
                                                        }}
                                                    />
                                                ) : (
                                                    <>
                                                        <img
                                                            src={f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}&sz=w320`}
                                                            alt={f.name}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-white/90 text-[18px]">visibility</span>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-semibold">
                                                    {durationById[f.id] || '--:--'}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-200 truncate font-semibold">{f.name}</div>
                                                <div className="text-[10px] text-slate-500 mt-1">Aggiornato: {formatDateTime(f.modifiedTime || f.createdTime)}</div>
                                            </div>
                                            <button
                                                onClick={() => onSelectClip?.(buildClipPayload(f))}
                                                className="text-[11px] px-2 py-1 rounded bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30"
                                            >
                                                Seleziona clip
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {genericFiles.slice(0, 30).map((f) => (
                                <div key={f.id} className="text-xs text-slate-400 truncate">{f.name}</div>
                            ))}
                            {genericFiles.length === 0 && fileTypeFilter !== 'video' && (
                                <div className="text-xs text-slate-500">Nessun file generico.</div>
                            )}
                        </div>

                        {/* TXT files section */}
                        <div className="mt-4">
                            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">File TXT ({txtFiles.length})</div>
                            <div className="space-y-1">
                                {txtFiles.map((f) => (
                                    <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-white/10">
                                        <span className="material-symbols-outlined text-slate-400 text-[16px]">description</span>
                                        <div className="flex-1 text-xs text-slate-300 truncate">{f.name}</div>
                                        <button
                                            onClick={() => openTxtFile(f)}
                                            className="text-[11px] px-2 py-1 rounded bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30"
                                        >
                                            Apri TXT
                                        </button>
                                    </div>
                                ))}
                                {txtFiles.length === 0 && <div className="text-xs text-slate-500">Nessun file txt.</div>}
                            </div>
                        </div>

                        {/* Clip preview */}
                        {previewClip && mode === 'clip' && (
                            <div className="mt-3 p-2 rounded-lg bg-black/40 border border-white/10">
                                <div className="text-[11px] text-slate-400 mb-2 truncate">Preview: {previewClip.name}</div>
                                <video
                                    src={`/api/drive/media/${previewClip.id}`}
                                    className="w-full max-h-56 rounded"
                                    muted
                                    autoPlay
                                    playsInline
                                    controls
                                />
                            </div>
                        )}

                        {/* TXT viewer */}
                        {(txtViewer.loading || txtViewer.content || txtViewer.error) && (
                            <div className="mt-3 p-2 rounded-lg bg-black/40 border border-white/10">
                                <div className="text-[11px] text-slate-400 mb-2 truncate">
                                    TXT: {txtViewer.name || 'lettura in corso'}
                                </div>
                                {txtViewer.loading && (
                                    <div className="text-xs text-slate-400">Caricamento contenuto...</div>
                                )}
                                {txtViewer.error && (
                                    <div className="text-xs text-red-400">{txtViewer.error}</div>
                                )}
                                {!txtViewer.loading && !txtViewer.error && (
                                    <textarea
                                        readOnly
                                        value={txtViewer.content}
                                        className="w-full min-h-[180px] rounded bg-slate-900/70 border border-white/10 p-2 text-xs text-slate-200"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};