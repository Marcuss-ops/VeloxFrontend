/**
 * Clip Picker Modal
 *
 * Modal for selecting video clips from a Drive folder.
 */

import React from 'react';
import type { DriveFile, ClipType } from './types';

interface ClipPickerModalProps {
    open: boolean;
    onClose: () => void;
    folderName: string;
    clipType: ClipType;
    files: DriveFile[];
    loading: boolean;
    addClipFromFile: (file: DriveFile, type: ClipType) => void;
}

export const ClipPickerModal: React.FC<ClipPickerModalProps> = ({
    open, onClose, folderName, clipType, files, loading, addClipFromFile,
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className="relative z-10 w-[90vw] max-w-4xl max-h-[70vh] rounded-2xl border border-white/10 bg-[rgba(18,15,28,0.98)] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-white/50">{clipType} clips</div>
                        <div className="text-sm font-bold text-white">{folderName}</div>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white text-sm">Close</button>
                </header>
                <div className="p-4 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-6 text-white/50 text-sm">
                            <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                            Loading clips...
                        </div>
                    )}
                    {!loading && files.length === 0 && (
                        <div className="text-center py-6 text-white/40 text-sm">No files found in this folder.</div>
                    )}
                    {!loading && files.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {files.map(file => (
                                <button
                                    key={file.id}
                                    onClick={() => addClipFromFile(file, clipType)}
                                    className="text-left rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-2"
                                >
                                    <div className="aspect-video rounded-md overflow-hidden bg-black/30 flex items-center justify-center mb-2">
                                        {file.thumbnailLink ? (
                                            <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-white/30 text-lg">movie</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-semibold text-white truncate">{file.name}</div>
                                    <div className="text-[9px] text-white/40">Click to add</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
