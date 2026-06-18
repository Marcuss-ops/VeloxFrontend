/**
 * Calendar Modal Component — Main Entry Point
 *
 * Video Production Calendar - Google Drive Integration
 * With YouTube Group selection and automatic Drive folder association
 *
 * Modularized architecture:
 * - types.ts: Shared types and utilities
 * - useCalendarState.ts: State management hook
 * - InfoTab.tsx: Info tab content
 * - ClipsTab.tsx: Clips tab content
 * - ClipPickerModal.tsx: Clip picker modal
 * - ClipDetailModal.tsx: Clip detail modal
 */

import React from 'react';
import { TitleSelectionModal } from '@/components/Script/modals/TitleSelectionModal';
import type { CalendarModalProps, CalendarEvent as CalendarEventType } from './types';
import { useCalendarState } from './useCalendarState';
import { InfoTab } from './InfoTab';
import { ClipsTab } from './ClipsTab';
import { ClipPickerModal } from './ClipPickerModal';
import { ClipDetailModal } from './ClipDetailModal';

export const CalendarModal: React.FC<CalendarModalProps> = ({
    event,
    selectedDay,
    selectedMonth,
    selectedYear,
    onClose,
    onSave,
    onDelete
}) => {
    const state = useCalendarState({
        selectedDay,
        selectedMonth,
        selectedYear,
        initialEvent: event,
        onClose,
    });

    const {
        title, setTitle, titles, setTitles, youtubeGroup,
        stockFootage, initialClips, intermediateClips, finalClips,
        youtubeGroups, driveGroups, loadingGroups,
        stockSubfolders, clipSubfolders, loadingStockSubfolders, loadingClipSubfolders,
        selectedStockFolderId, setSelectedStockFolderId,
        selectedInitialClipFolderId, setSelectedInitialClipFolderId,
        selectedIntermediateClipFolderId, setSelectedIntermediateClipFolderId,
        selectedFinalClipFolderId, setSelectedFinalClipFolderId,
        stockFolderCounts, clipPickerOpen, setClipPickerOpen, clipPickerFolderId,
        clipPickerFolderName, clipPickerType, clipPickerFiles, clipPickerLoading,
        titleSelectionOpen, setTitleSelectionOpen, activeTab, handleTabChange,
        scriptText, setScriptText, youtubeLinks, setYoutubeLinks, newYoutubeLink, setNewYoutubeLink,
        voiceoverPaths, setVoiceoverPaths,
        scriptHistory, youtubeHistory, showScriptHistory, setShowScriptHistory,
        showYoutubeHistory, setShowYoutubeHistory,
        selectedCategory, setSelectedCategory, projectStatus,
        clipDetailOpen, setClipDetailOpen, selectedClip,
        clipDetailFiles, clipDetailLoading, setClipDetailLoading,
        audioPlayerUrl, setAudioPlayerUrl, textContent, setTextContent,
        textContentLoading, setTextContentLoading,
        selectedDriveGroup: selectedDriveGroupRaw, monthName, clipFolderNameById, stockFolderNameById,
        handleRemoveClip, handleSave, openClipPicker, scheduleClipPicker,
        cancelClipPickerHover, addClipFromFile, handleClipHoverPreview,
        setClipDetailFiles, setClipDetailLoading: setClipDetailLoadingState,
    } = state;

    const selectedDriveGroup = selectedDriveGroupRaw || null;

    // Override handleSave to call parent onSave
    const handleSaveWithParent = () => {
        const newEvent: CalendarEventType = {
            id: event?.id || `event_${Date.now()}`,
            title: title || `Video ${selectedDay}/${selectedMonth + 1}`,
            date: selectedDay,
            month: selectedMonth,
            year: selectedYear,
            youtubeGroup,
            status: projectStatus,
            stockFootage,
            initialClips,
            intermediateClips,
            finalClips,
            titles,
            scriptText,
            youtubeLinks,
            voiceoverPaths,
            category: selectedCategory,
        };
        state.clearDraft();
        onSave(newEvent);
        onClose();
    };

    return (
        <>
            {/* Modal Overlay */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-0" onClick={onClose} />

            {/* Modal */}
            <div
                className="relative z-10 w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col"
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90vw',
                    maxWidth: '72rem',
                    height: '75vh',
                    background: 'rgba(15, 12, 25, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(139, 92, 246, 0.20)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)',
                }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-violet-600 rounded-full" />
                        <div>
                            <h1 className="text-base font-bold text-white">{title || 'Video Production'}</h1>
                            <p className="text-[10px] text-white/40">{selectedDay} {monthName} {selectedYear}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {event && onDelete && (
                            <button
                                onClick={() => { if (confirm('Are you sure you want to delete this project?')) { onDelete(event.id); onClose(); } }}
                                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                            >
                                Delete
                            </button>
                        )}
                        <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSaveWithParent} className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 transition-opacity">
                            Save
                        </button>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 px-4 pt-2 border-b border-white/10">
                    <button
                        onClick={() => handleTabChange('info')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${
                            activeTab === 'info' ? 'text-purple-400 border-purple-400' : 'text-white/50 border-transparent hover:text-white/70'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm mr-1 inline-block">info</span>
                        Info
                    </button>
                    <button
                        onClick={() => handleTabChange('clips')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${
                            activeTab === 'clips' ? 'text-green-400 border-green-400' : 'text-white/50 border-transparent hover:text-white/70'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm mr-1 inline-block">movie</span>
                        Clips
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeTab === 'info' && (
                        <InfoTab
                            title={title}
                            setTitle={setTitle}
                            titles={titles}
                            setTitles={setTitles}
                            youtubeGroup={youtubeGroup}
                            youtubeGroups={youtubeGroups}
                            driveGroups={driveGroups}
                            loadingGroups={loadingGroups}
                            selectedDriveGroup={selectedDriveGroup}
                            scriptText={scriptText}
                            setScriptText={setScriptText}
                            youtubeLinks={youtubeLinks}
                            setYoutubeLinks={setYoutubeLinks}
                            newYoutubeLink={newYoutubeLink}
                            setNewYoutubeLink={setNewYoutubeLink}
                            voiceoverPaths={voiceoverPaths}
                            setVoiceoverPaths={setVoiceoverPaths}
                            scriptHistory={scriptHistory}
                            youtubeHistory={youtubeHistory}
                            showScriptHistory={showScriptHistory}
                            setShowScriptHistory={setShowScriptHistory}
                            showYoutubeHistory={showYoutubeHistory}
                            setShowYoutubeHistory={setShowYoutubeHistory}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            titleSelectionOpen={titleSelectionOpen}
                            setTitleSelectionOpen={setTitleSelectionOpen}
                        />
                    )}
                    {activeTab === 'clips' && (
                        <ClipsTab
                            stockSubfolders={stockSubfolders}
                            clipSubfolders={clipSubfolders}
                            loadingStockSubfolders={loadingStockSubfolders}
                            loadingClipSubfolders={loadingClipSubfolders}
                            selectedStockFolderId={selectedStockFolderId}
                            setSelectedStockFolderId={setSelectedStockFolderId}
                            selectedInitialClipFolderId={selectedInitialClipFolderId}
                            setSelectedInitialClipFolderId={setSelectedInitialClipFolderId}
                            selectedIntermediateClipFolderId={selectedIntermediateClipFolderId}
                            setSelectedIntermediateClipFolderId={setSelectedIntermediateClipFolderId}
                            selectedFinalClipFolderId={selectedFinalClipFolderId}
                            setSelectedFinalClipFolderId={setSelectedFinalClipFolderId}
                            stockFolderCounts={stockFolderCounts}
                            stockFolderNameById={stockFolderNameById}
                            clipFolderNameById={clipFolderNameById}
                            initialClips={initialClips}
                            intermediateClips={intermediateClips}
                            finalClips={finalClips}
                            handleRemoveClip={handleRemoveClip}
                            handleClipHoverPreview={handleClipHoverPreview}
                            openClipPicker={openClipPicker}
                            scheduleClipPicker={scheduleClipPicker}
                            cancelClipPickerHover={cancelClipPickerHover}
                            selectedDriveGroup={selectedDriveGroup}
                        />
                    )}
                </div>
            </div>

            {/* Clip Picker Modal */}
            <ClipPickerModal
                open={clipPickerOpen}
                onClose={() => setClipPickerOpen(false)}
                folderName={clipPickerFolderName}
                clipType={clipPickerType}
                files={clipPickerFiles}
                loading={clipPickerLoading}
                addClipFromFile={addClipFromFile}
            />

            {/* Clip Detail Modal */}
            <ClipDetailModal
                open={clipDetailOpen}
                onClose={() => setClipDetailOpen(false)}
                clip={selectedClip}
                files={clipDetailFiles}
                loading={clipDetailLoading}
                audioPlayerUrl={audioPlayerUrl}
                setAudioPlayerUrl={setAudioPlayerUrl}
                textContent={textContent}
                setTextContent={setTextContent}
                textContentLoading={textContentLoading}
                setTextContentLoading={setTextContentLoading}
                handleRemoveClip={handleRemoveClip}
                setClipDetailFiles={setClipDetailFiles}
                setClipDetailLoading={setClipDetailLoading}
            />

            {/* Title Selection Modal */}
            <TitleSelectionModal
                open={titleSelectionOpen}
                onOpenChange={setTitleSelectionOpen}
                onSelectTitle={(selectedTitle) => {
                    const newTitles = selectedTitle.split(',').map(t => t.trim()).filter(Boolean);
                    setTitles(prev => [...prev, ...newTitles]);
                }}
                currentTitle={titles.join(', ')}
            />
        </>
    );
};

export default CalendarModal;
