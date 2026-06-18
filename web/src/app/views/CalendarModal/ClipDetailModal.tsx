/**
 * Clip Detail Modal
 *
 * Modal for viewing clip details: video preview, audio player, text files, associated files.
 */

import React from 'react';
import type { VideoClip, DriveFile } from './types';
import { fetchDriveFiles } from './types';

interface ClipDetailModalProps {
    open: boolean;
    onClose: () => void;
    clip: VideoClip | null;
    files: DriveFile[];
    loading: boolean;
    audioPlayerUrl: string | null;
    setAudioPlayerUrl: (url: string | null) => void;
    textContent: string | null;
    setTextContent: (content: string | null) => void;
    textContentLoading: boolean;
    setTextContentLoading: (loading: boolean) => void;
    handleRemoveClip: (clipId: string, type: 'stock' | 'initial' | 'intermediate' | 'final') => void;
    setClipDetailFiles: (files: DriveFile[]) => void;
    setClipDetailLoading: (loading: boolean) => void;
}

export const ClipDetailModal: React.FC<ClipDetailModalProps> = ({
    open, onClose, clip, files, loading,
    audioPlayerUrl, setAudioPlayerUrl,
    textContent, setTextContent, textContentLoading, setTextContentLoading,
    handleRemoveClip, setClipDetailFiles, setClipDetailLoading,
}) => {
    if (!open || !clip) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80" onClick={onClose} />
            <div className="relative z-10 w-[90vw] max-w-5xl max-h-[80vh] rounded-2xl border border-white/10 bg-[rgba(18,15,28,0.98)] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            clip.type === 'initial' ? 'bg-green-500/30 text-green-300' :
                            clip.type === 'intermediate' ? 'bg-orange-500/30 text-orange-300' :
                            'bg-red-500/30 text-red-300'
                        }`}>
                            {clip.type.toUpperCase()}
                        </span>
                        <div>
                            <div className="text-sm font-bold text-white">{clip.name}</div>
                            <div className="text-[10px] text-white/40">ID: {clip.id}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white text-sm">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Video Preview */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">movie</span>
                                Anteprima Video
                            </h3>
                            <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                                {clip.thumbnail ? (
                                    <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-white/20 text-4xl">video_file</span>
                                )}
                            </div>
                            {clip.duration && (
                                <div className="text-[10px] text-white/50 text-center">
                                    Durata: {Math.floor(clip.duration / 60000)}:{Math.floor((clip.duration % 60000) / 1000).toString().padStart(2, '0')}
                                </div>
                            )}
                        </div>

                        {/* Audio & Text Files */}
                        <div className="space-y-3">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                {audioPlayerUrl ? (
                                    <div className="space-y-2">
                                        <audio controls src={audioPlayerUrl} className="w-full" style={{ height: '40px' }} />
                                        <button onClick={() => setAudioPlayerUrl(null)} className="text-[10px] text-white/50 hover:text-white transition-colors">Chiudi audio</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/drive/file/${clip.driveId}/audio`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    setAudioPlayerUrl(data.audioUrl || `/api/drive/file/${clip.driveId}/download`);
                                                } else {
                                                    setAudioPlayerUrl(`/api/drive/file/${clip.driveId}/download`);
                                                }
                                            } catch (err) {
                                                console.error('Failed to load audio:', err);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg text-xs font-bold transition-colors w-full justify-center"
                                    >
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        Carica Audio
                                    </button>
                                )}
                            </div>

                            {/* Text Files */}
                            <div>
                                {textContentLoading ? (
                                    <div className="flex items-center justify-center py-4"><span className="material-symbols-outlined text-white/30 animate-spin">sync</span></div>
                                ) : textContent ? (
                                    <div className="space-y-2">
                                        <pre className="text-[11px] text-white/80 whitespace-pre-wrap max-h-48 overflow-y-auto bg-black/30 p-3 rounded-lg">{textContent}</pre>
                                        <button onClick={() => setTextContent(null)} className="text-[10px] text-white/50 hover:text-white transition-colors">Chiudi</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            setTextContentLoading(true);
                                            try {
                                                const res = await fetch(`/api/drive/file/${clip.driveId}/text`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    setTextContent(data.textContent || 'Nessun contenuto testuale disponibile');
                                                } else {
                                                    setTextContent('File di testo non trovato per questo clip.');
                                                }
                                            } catch (err) {
                                                console.error('Failed to load text:', err);
                                                setTextContent('Errore nel caricamento del file di testo.');
                                            } finally {
                                                setTextContentLoading(false);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-bold transition-colors w-full justify-center"
                                    >
                                        <span className="material-symbols-outlined text-sm">description</span>
                                        Carica File Testo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Associated Files */}
                    <div className="mt-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-sm">folder_open</span>
                            File nella stessa cartella
                        </h3>
                        {loading ? (
                            <div className="flex items-center justify-center py-4"><span className="material-symbols-outlined text-white/30 animate-spin">sync</span></div>
                        ) : files.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {files.slice(0, 12).map(file => (
                                    <div key={file.id} className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-green-500/30 transition-colors">
                                        <div className="aspect-video bg-black/30 rounded overflow-hidden mb-1 flex items-center justify-center">
                                            {file.thumbnailLink ? (
                                                <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-white/20 text-sm">
                                                    {file.mimeType?.includes('audio') ? 'audio_file' : file.mimeType?.includes('text') ? 'description' : 'insert_drive_file'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-white/50 truncate">{file.name}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-white/30 text-xs">Clicca per caricare i file della cartella</div>
                        )}
                        <button
                            onClick={async () => {
                                if (!clip.driveId) return;
                                setClipDetailLoading(true);
                                try {
                                    const fileRes = await fetch(`/api/drive/file/${clip.driveId}`);
                                    if (fileRes.ok) {
                                        const fileData = await fileRes.json();
                                        const parentId = fileData.parents?.[0];
                                        if (parentId) {
                                            const folderFiles = await fetchDriveFiles(parentId);
                                            setClipDetailFiles(folderFiles.filter(f => f.id !== clip.driveId));
                                        }
                                    }
                                } catch (err) {
                                    console.error('Failed to load folder files:', err);
                                } finally {
                                    setClipDetailLoading(false);
                                }
                            }}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            Carica file cartella
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                    <div className="text-[10px] text-white/40">Drive ID: {clip.driveId}</div>
                    <div className="flex items-center gap-2">
                        <a href={`https://drive.google.com/file/d/${clip.driveId}/view`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-bold transition-colors">
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Apri in Drive
                        </a>
                        <button onClick={() => handleRemoveClip(clip.id, clip.type)} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Rimuovi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
