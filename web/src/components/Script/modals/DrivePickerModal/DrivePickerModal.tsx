import React from 'react';
import { useDrivePicker } from './hooks/useDrivePicker';
import { DrivePickerHeader } from './components/DrivePickerHeader';
import { DriveFileTree } from './components/DriveFileTree';

interface DrivePickerModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'clip' | 'stock' | 'voiceover';
    title: string;
    initialFolderId?: string | null;
    initialFolderName?: string | null;
    /** Gruppo YouTube selezionato in tab Script: apre il modal già nella cartella corrispondente (clip/stock/voiceover) */
    selectedGroup?: string | null;
    /** ID cartella master (Clips / Stock / Voiceover) per risolvere selectedGroup da drive_links */
    masterFolderId?: string | null;
    onSelectFolder: (folder: { id: string; name: string }) => void;
    onSelectClip?: (clip: { id: string; name: string; url: string }) => void;
    onSelectClips?: (clips: Array<{ id: string; name: string; url: string }>) => void;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = (props) => {
    const h = useDrivePicker(props);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={h.onClose} />
            <div className="relative w-full max-w-4xl max-h-[86vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <DrivePickerHeader
                    title={h.title}
                    mode={h.mode}
                    currentFolderName={h.currentFolderName}
                    path={h.path}
                    searchTerm={h.searchTerm}
                    fileTypeFilter={h.fileTypeFilter}
                    sortBy={h.sortBy}
                    selectedClipIds={h.selectedClipIds}
                    currentFolderId={h.currentFolderId}
                    onClose={h.onClose}
                    onSelectFolder={h.onSelectFolder}
                    addSelectedClips={h.addSelectedClips}
                    loadFolder={h.loadFolder}
                    setSearchTerm={h.setSearchTerm}
                    setFileTypeFilter={h.setFileTypeFilter}
                    setSortBy={h.setSortBy}
                />
                <DriveFileTree
                    loading={h.loading}
                    error={h.error}
                    mode={h.mode}
                    filteredFolders={h.filteredFolders}
                    filteredFiles={h.filteredFiles}
                    clipFiles={h.clipFiles}
                    txtFiles={h.txtFiles}
                    genericFiles={h.genericFiles}
                    path={h.path}
                    selectedClipIds={h.selectedClipIds}
                    activePreviewId={h.activePreviewId}
                    previewClip={h.previewClip}
                    durationById={h.durationById}
                    txtViewer={h.txtViewer}
                    fileTypeFilter={h.fileTypeFilter}
                    onSelectFolder={h.onSelectFolder}
                    onSelectClip={h.onSelectClip}
                    loadFolder={h.loadFolder}
                    toggleClipSelection={h.toggleClipSelection}
                    buildClipPayload={h.buildClipPayload}
                    openTxtFile={h.openTxtFile}
                    startClipPreviewHover={h.startClipPreviewHover}
                    clearClipPreviewHover={h.clearClipPreviewHover}
                    formatDateTime={h.formatDateTime}
                    formatDuration={h.formatDuration}
                    setDurationById={h.setDurationById}
                />
            </div>
        </div>
    );
};