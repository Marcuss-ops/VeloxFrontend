import React from 'react';
import { VideoProject } from '../../types';
import { ProjectHistoryItem } from '../../modals/ProjectHistoryModal';
import { useScriptCanvas, TitleSourceHistoryItem } from './hooks/useScriptCanvas';
import { CanvasContent } from './components/CanvasContent';

export interface ScriptCanvasProps {
    // State
    project: VideoProject;
    canUndo: boolean;
    titleLinkHistory: TitleSourceHistoryItem[];
    projectHistory: ProjectHistoryItem[];
    isGenerating: boolean;
    progress: { percent: number; status: string; logs: string[] };
    // Actions
    onProjectUpdate: (updated: Partial<VideoProject>) => void;
    onPushSelectionHistory: (p: VideoProject) => void;
    onUndo: () => void;
    // Modal state (controlled by parent)
    titleHistoryModalOpen?: boolean;
    setTitleHistoryModalOpen?: (open: boolean) => void;
    projectHistoryModalOpen?: boolean;
    setProjectHistoryModalOpen?: (open: boolean) => void;
    // History callbacks
    onUpsertTitleLink?: (title: string, link: string) => void;
    onDeleteTitleLink?: (itemId: string) => void;
    onClearTitleLinkHistory?: () => void;
    onMarkHistoryUsed?: (itemId: string) => void;
    onApplyProjectHistory?: (item: ProjectHistoryItem) => void;
    onDeleteProjectHistory?: (itemId: string) => void;
    onClearProjectHistory?: () => void;
}

export const ScriptCanvas: React.FC<ScriptCanvasProps> = ({
    project,
    canUndo,
    titleLinkHistory,
    projectHistory,
    isGenerating,
    progress,
    onProjectUpdate,
    onPushSelectionHistory,
    onUndo,
    titleHistoryModalOpen,
    setTitleHistoryModalOpen,
    projectHistoryModalOpen,
    setProjectHistoryModalOpen,
    onUpsertTitleLink,
    onDeleteTitleLink,
    onClearTitleLinkHistory,
    onMarkHistoryUsed,
    onApplyProjectHistory,
    onDeleteProjectHistory,
    onClearProjectHistory,
}) => {
    const hook = useScriptCanvas({
        project,
        canUndo,
        titleLinkHistory,
        projectHistory,
        isGenerating,
        progress,
        onProjectUpdate,
        onPushSelectionHistory,
        onUndo,
        titleHistoryModalOpen,
        setTitleHistoryModalOpen,
        projectHistoryModalOpen,
        setProjectHistoryModalOpen,
        onUpsertTitleLink,
        onDeleteTitleLink,
        onClearTitleLinkHistory,
        onMarkHistoryUsed,
        onApplyProjectHistory,
        onDeleteProjectHistory,
        onClearProjectHistory,
    });

    return (
        <CanvasContent
            project={project}
            canUndo={canUndo}
            titleLinkHistory={titleLinkHistory}
            projectHistory={projectHistory}
            isGenerating={isGenerating}
            progress={progress}
            drivePicker={hook.drivePicker}
            setDrivePicker={hook.setDrivePicker}
            isTitleModalOpen={hook.isTitleModalOpen}
            setTitleModalOpen={hook.setTitleModalOpen}
            isProjectModalOpen={hook.isProjectModalOpen}
            setProjectModalOpen={hook.setProjectModalOpen}
            CLIP_MASTER_ID={hook.CLIP_MASTER_ID}
            STOCK_MASTER_ID={hook.STOCK_MASTER_ID}
            VOICEOVER_MASTER_ID={hook.VOICEOVER_MASTER_ID}
            onProjectUpdate={onProjectUpdate}
            onPushSelectionHistory={onPushSelectionHistory}
            onUndo={onUndo}
            handleDriveClick={hook.handleDriveClick}
            handleSelectFolder={hook.handleSelectFolder}
            handleSelectClip={hook.handleSelectClip}
            handleSelectClips={hook.handleSelectClips}
            handleOpenHistory={hook.handleOpenHistory}
            appendTitleFromHistory={hook.appendTitleFromHistory}
            appendLinkToSourceContext={hook.appendLinkToSourceContext}
            handleMarkHistoryUsed={hook.handleMarkHistoryUsed}
            onDeleteTitleLink={hook.onDeleteTitleLink}
            onClearTitleLinkHistory={hook.onClearTitleLinkHistory}
            onApplyProjectHistory={hook.onApplyProjectHistory}
            onDeleteProjectHistory={hook.onDeleteProjectHistory}
            onClearProjectHistory={hook.onClearProjectHistory}
        />
    );
};