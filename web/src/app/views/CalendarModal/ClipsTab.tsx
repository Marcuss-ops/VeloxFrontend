/**
 * Clips Tab Component
 *
 * Renders the Clips tab of the Calendar Modal:
 * Stock footage, initial/intermediate/final clips, voiceover section.
 */

import React from 'react';
import { ClipThumbnail } from './ClipThumbnail';
import type { VideoClip, DriveFolderLite, DriveGroup, ClipType } from './types';

interface ClipsTabProps {
    stockSubfolders: DriveFolderLite[];
    clipSubfolders: DriveFolderLite[];
    loadingStockSubfolders: boolean;
    loadingClipSubfolders: boolean;
    selectedStockFolderId: string;
    setSelectedStockFolderId: (id: string) => void;
    selectedInitialClipFolderId: string;
    setSelectedInitialClipFolderId: (id: string) => void;
    selectedIntermediateClipFolderId: string;
    setSelectedIntermediateClipFolderId: (id: string) => void;
    selectedFinalClipFolderId: string;
    setSelectedFinalClipFolderId: (id: string) => void;
    stockFolderCounts: Record<string, number>;
    stockFolderNameById: Map<string, string>;
    clipFolderNameById: Map<string, string>;
    initialClips: VideoClip[];
    intermediateClips: VideoClip[];
    finalClips: VideoClip[];
    handleRemoveClip: (clipId: string, type: 'stock' | 'initial' | 'intermediate' | 'final') => void;
    handleClipHoverPreview: (clip: VideoClip) => void;
    openClipPicker: (folder: DriveFolderLite, type: ClipType) => void;
    scheduleClipPicker: (folder: DriveFolderLite, type: ClipType) => void;
    cancelClipPickerHover: () => void;
    selectedDriveGroup: DriveGroup | null;
}

export const ClipsTab: React.FC<ClipsTabProps> = ({
    stockSubfolders, clipSubfolders, loadingStockSubfolders, loadingClipSubfolders,
    selectedStockFolderId, setSelectedStockFolderId,
    selectedInitialClipFolderId, setSelectedInitialClipFolderId,
    selectedIntermediateClipFolderId, setSelectedIntermediateClipFolderId,
    selectedFinalClipFolderId, setSelectedFinalClipFolderId,
    stockFolderCounts, stockFolderNameById, clipFolderNameById,
    initialClips, intermediateClips, finalClips,
    handleRemoveClip, handleClipHoverPreview,
    openClipPicker, scheduleClipPicker, cancelClipPickerHover,
    selectedDriveGroup,
}) => {
    const renderClipFolderPicker = (selectedId: string, onSelect: (id: string) => void, type: ClipType) => {
        if (loadingClipSubfolders) {
            return (
                <div className="flex items-center justify-center py-3">
                    <span className="material-symbols-outlined text-white/30 animate-spin">sync</span>
                </div>
            );
        }
        if (clipSubfolders.length === 0) {
            return (
                <div className="text-center py-3 text-white/30 text-[10px]">
                    {selectedDriveGroup?.clip ? 'No clip subfolders found' : 'Select a social group to load clip folders'}
                </div>
            );
        }
        return (
            <div className="flex flex-wrap gap-2">
                {clipSubfolders.map(folder => (
                    <button
                        key={folder.id}
                        onClick={() => onSelect(folder.id)}
                        onMouseEnter={() => scheduleClipPicker(folder, type)}
                        onMouseLeave={cancelClipPickerHover}
                        className={`px-2 py-1 rounded-md border text-[10px] transition-all ${
                            selectedId === folder.id ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-green-500/30'
                        }`}
                    >
                        {folder.name}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Stock Footage */}
            <section className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">video_library</span>
                        Stock Footage
                    </h3>
                    <span className="text-[9px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">{stockSubfolders.length} folders</span>
                </div>
                <div className="mb-2 text-[10px] text-white/50">
                    Folder: {selectedStockFolderId ? (stockFolderNameById.get(selectedStockFolderId) || 'Unknown') : 'Not selected'}
                </div>

                {loadingStockSubfolders ? (
                    <div className="flex items-center justify-center py-4">
                        <span className="material-symbols-outlined text-white/30 animate-spin">sync</span>
                    </div>
                ) : stockSubfolders.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {stockSubfolders.map(folder => (
                            <button
                                key={folder.id}
                                onClick={() => setSelectedStockFolderId(folder.id)}
                                className={`p-3 rounded-lg border transition-all text-left group ${
                                    selectedStockFolderId === folder.id ? 'bg-blue-500/20 border-blue-500/60' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/50'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-blue-400 text-sm">folder</span>
                                    <span className="text-[10px] font-bold text-white truncate flex-1">{folder.name}</span>
                                </div>
                                <div className="text-[8px] text-white/40">
                                    {stockFolderCounts[folder.id] !== undefined
                                        ? `${selectedStockFolderId === folder.id ? 'Selected • ' : ''}${stockFolderCounts[folder.id]} items`
                                        : `${selectedStockFolderId === folder.id ? 'Selected' : 'Loading count...'}`}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-white/30 text-xs">
                        {selectedDriveGroup?.stock ? 'No subfolders found' : 'Select a social group to load stock folders'}
                    </div>
                )}
            </section>

            {/* Clips Sections */}
            <div className="space-y-3">
                {/* Initial Clips */}
                <section className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-green-400">Initial Clips</h3>
                        <span className="text-[9px] bg-green-500/20 px-1.5 py-0.5 rounded text-green-300">{initialClips.length}</span>
                    </div>
                    <div className="mb-2 text-[10px] text-white/50">
                        Folder: {selectedInitialClipFolderId ? (clipFolderNameById.get(selectedInitialClipFolderId) || 'Unknown') : 'Not selected'}
                    </div>
                    {renderClipFolderPicker(selectedInitialClipFolderId, setSelectedInitialClipFolderId, 'initial')}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-3">
                        {initialClips.map(clip => (
                            <ClipThumbnail key={clip.id} clip={clip} onRemove={() => handleRemoveClip(clip.id, 'initial')} onHoverPreview={handleClipHoverPreview} />
                        ))}
                        {initialClips.length === 0 && (
                            <div className="col-span-full text-center py-3 text-white/30 text-xs">
                                {selectedDriveGroup?.clip ? 'Seleziona cartella clip sopra' : 'Select group'}
                            </div>
                        )}
                    </div>
                </section>

                {/* Intermediate Clips */}
                <section className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-400">Intermediate Clips</h3>
                        <span className="text-[9px] bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-300">{intermediateClips.length}</span>
                    </div>
                    <div className="mb-2 text-[10px] text-white/50">
                        Folder: {selectedIntermediateClipFolderId ? (clipFolderNameById.get(selectedIntermediateClipFolderId) || 'Unknown') : 'Not selected'}
                    </div>
                    {renderClipFolderPicker(selectedIntermediateClipFolderId, setSelectedIntermediateClipFolderId, 'intermediate')}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-3">
                        {intermediateClips.map(clip => (
                            <ClipThumbnail key={clip.id} clip={clip} onRemove={() => handleRemoveClip(clip.id, 'intermediate')} onHoverPreview={handleClipHoverPreview} />
                        ))}
                        {intermediateClips.length === 0 && (
                            <div className="col-span-full text-center py-3 text-white/30 text-xs">Seleziona cartella clip sopra</div>
                        )}
                    </div>
                </section>

                {/* Final Clips */}
                <section className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400">Final Clips</h3>
                        <span className="text-[9px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-300">{finalClips.length}</span>
                    </div>
                    <div className="mb-2 text-[10px] text-white/50">
                        Folder: {selectedFinalClipFolderId ? (clipFolderNameById.get(selectedFinalClipFolderId) || 'Unknown') : 'Not selected'}
                    </div>
                    {renderClipFolderPicker(selectedFinalClipFolderId, setSelectedFinalClipFolderId, 'final')}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-3">
                        {finalClips.map(clip => (
                            <ClipThumbnail key={clip.id} clip={clip} onRemove={() => handleRemoveClip(clip.id, 'final')} onHoverPreview={handleClipHoverPreview} />
                        ))}
                        {finalClips.length === 0 && (
                            <div className="col-span-full text-center py-3 text-white/30 text-xs">Seleziona cartella clip sopra</div>
                        )}
                    </div>
                </section>
            </div>

            {/* Voiceover Section */}
            {selectedDriveGroup?.voiceover && (
                <section className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">mic</span>
                            Voiceover
                        </h3>
                        <span className="text-[9px] bg-orange-500/20 px-2 py-1 rounded text-orange-300">{selectedDriveGroup.voiceover.name}</span>
                    </div>
                    <div className="text-center py-6 text-white/30 text-xs">
                        <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">mic</span>
                        Cartella voiceover: {selectedDriveGroup.voiceover.name}
                        <br /><span className="text-[10px]">Clicca per visualizzare i file audio</span>
                    </div>
                </section>
            )}
        </>
    );
};
