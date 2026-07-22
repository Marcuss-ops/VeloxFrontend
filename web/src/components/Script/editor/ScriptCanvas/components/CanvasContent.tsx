import React from 'react';
import { VideoProject } from '../../../types';
import { TitleListEditor } from '../../../titles/TitleListEditor';
import { LanguageSelectors } from '../../../config/LanguageSelectors';
import { AssetConfig } from '../../../config/AssetConfig';
import { AssetManagementHub } from '../../../AssetManagementHub';
import { AIPromptSection } from '../../../config/AIPromptSection';
import { DrivePickerModal } from '../../../modals/DrivePickerModal';
import { RemoteStatusPanel } from '../../../RemoteStatusPanel';
import { GenerationProgress } from '../../../GenerationProgress';
import { TitleLinkHistoryModal } from '../../../modals/TitleLinkHistoryModal';
import { ProjectHistoryModal, ProjectHistoryItem } from '../../../modals/ProjectHistoryModal';
import { CanvasToolbar } from './CanvasToolbar';
import { TitleSourceHistoryItem } from '../hooks/useScriptCanvas';

export interface CanvasContentProps {
    // Project state
    project: VideoProject;
    canUndo: boolean;
    titleLinkHistory: TitleSourceHistoryItem[];
    projectHistory: ProjectHistoryItem[];
    isGenerating: boolean;
    progress: { percent: number; status: string; logs: string[] };
    // Drive picker
    drivePicker: { open: boolean; type: 'initial' | 'stock' | 'final' | 'voiceover' | 'inter' | null };
    setDrivePicker: (state: { open: boolean; type: 'initial' | 'stock' | 'final' | 'voiceover' | 'inter' | null }) => void;
    // Modal state
    isTitleModalOpen: boolean;
    setTitleModalOpen: (open: boolean) => void;
    isProjectModalOpen: boolean;
    setProjectModalOpen: (open: boolean) => void;
    // Constants
    CLIP_MASTER_ID: string;
    STOCK_MASTER_ID: string;
    VOICEOVER_MASTER_ID: string;
    // Actions
    onProjectUpdate: (updated: Partial<VideoProject>) => void;
    onPushSelectionHistory: (p: VideoProject) => void;
    onUndo: () => void;
    // Callbacks
    handleDriveClick: (type: string, payload?: any) => void;
    handleSelectFolder: (folder: any) => void;
    handleSelectClip: (clip: any) => void;
    handleSelectClips: (clips: any[]) => void;
    handleOpenHistory: () => void;
    appendTitleFromHistory: (titleRaw: string) => void;
    appendLinkToSourceContext: (linkRaw: string) => void;
    handleMarkHistoryUsed: (itemId: string) => void;
    // History callbacks (passthrough)
    onDeleteTitleLink?: (itemId: string) => void;
    onClearTitleLinkHistory?: () => void;
    onApplyProjectHistory?: (item: ProjectHistoryItem) => void;
    onDeleteProjectHistory?: (itemId: string) => void;
    onClearProjectHistory?: () => void;
}

export const CanvasContent: React.FC<CanvasContentProps> = ({
    project,
    canUndo,
    titleLinkHistory,
    projectHistory,
    isGenerating,
    progress,
    drivePicker,
    setDrivePicker,
    isTitleModalOpen,
    setTitleModalOpen,
    isProjectModalOpen,
    setProjectModalOpen,
    CLIP_MASTER_ID,
    STOCK_MASTER_ID,
    VOICEOVER_MASTER_ID,
    onProjectUpdate,
    onPushSelectionHistory,
    onUndo,
    handleDriveClick,
    handleSelectFolder,
    handleSelectClip,
    handleSelectClips,
    handleOpenHistory,
    appendTitleFromHistory,
    appendLinkToSourceContext,
    handleMarkHistoryUsed,
    onDeleteTitleLink,
    onClearTitleLinkHistory,
    onApplyProjectHistory,
    onDeleteProjectHistory,
    onClearProjectHistory,
}) => {
    // Determine if we're in AI mode (hide Clip/Stock, show AI Prompt)
    const isAiMode = project.videoStyle === 'ai-image' || project.videoStyle === 'ai-video';

    // Modal setter with correct type
    const closeDrivePicker = () => setDrivePicker({ open: false, type: null });

    return (
        <div className="flex flex-col gap-6">
            {/* VIDEO TITLES - PREMIUM */}
            <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20">
                <div className="relative">
                    <TitleListEditor
                        titles={project.titles}
                        onTitlesChange={(titles: string[]) => onProjectUpdate({ titles })}
                        onOpenHistory={handleOpenHistory}
                    />
                </div>
            </div>

            {/* 50/50 SPLIT: SOURCE CONTEXT & PARAMETER HUB */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* SOURCE CONTEXT - LEFT COLUMN */}
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 h-full">
                    <div className="h-full flex flex-col">
                        <CanvasToolbar onOpenHistory={handleOpenHistory} />
                        <div className="relative flex-1">
                            <textarea
                                value={project.sourceContext}
                                onChange={(e) => onProjectUpdate({ sourceContext: e.target.value })}
                                placeholder="Paste link or text... Incolla link o testi..."
                                className="w-full h-full min-h-[280px] bg-slate-950/70 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500/40 outline-none resize-none transition-all hover:border-white/20 custom-scrollbar"
                            />
                        </div>
                    </div>
                </div>

                {/* PARAMETER HUB - RIGHT COLUMN (LANGUAGES + ASSETS) */}
                <div className="flex flex-col gap-6">
                    {/* LANGUAGES */}
                    <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20 flex-1">
                        <div className="relative h-full">
                            <LanguageSelectors
                                voiceoverLangs={project.voiceoverLangs}
                                onVoiceoverLangsChange={(langs: string[]) => onProjectUpdate({ voiceoverLangs: langs })}
                            />
                        </div>
                    </div>

                    {/* ASSETS (BACKGROUND & MUSIC) */}
                    <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20">
                        <div className="relative">
                            <AssetConfig
                                background={project.background}
                                music={project.music}
                                onBackgroundChange={(val: string) => onProjectUpdate({ background: val })}
                                onMusicChange={(val: string) => onProjectUpdate({ music: val })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MANAGEMENT HUB - HIDDEN IN AI MODE (ai-image / ai-video) */}
            {!isAiMode && (
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20">
                    <div className="relative">
                        <AssetManagementHub
                            clipFolders={project.clipFolders}
                            voiceoverStatus={project.voiceoverFolderId ? `Drive folder: ${project.voiceoverFolderId}` : 'Nessuna cartella voiceover'}
                            stockItems={project.stockTimestamps}
                            onDriveClick={handleDriveClick}
                            driveFolders={{
                                clipName: project.clipMainFolderName,
                                stockName: project.stockMainFolderName,
                                voiceoverName: project.voiceoverMainFolderName,
                            }}
                            canUndo={canUndo}
                            onUndo={onUndo}
                            onReorderClip={(type, fromIndex, toIndex) => {
                                const list = [...(project.clipFolders[type] || [])];
                                if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
                                onPushSelectionHistory(project);
                                const [moved] = list.splice(fromIndex, 1);
                                list.splice(toIndex, 0, moved);
                                onProjectUpdate({
                                    clipFolders: {
                                        ...project.clipFolders,
                                        [type]: list,
                                    },
                                });
                            }}
                            onMoveClip={(fromType, toType, index) => {
                                if (fromType === toType) return;
                                const fromList = [...(project.clipFolders[fromType] || [])];
                                if (index < 0 || index >= fromList.length) return;
                                const value = fromList[index];
                                const toList = [...(project.clipFolders[toType] || [])];
                                if (toList.includes(value)) {
                                    fromList.splice(index, 1);
                                } else {
                                    fromList.splice(index, 1);
                                    toList.push(value);
                                }
                                onPushSelectionHistory(project);
                                onProjectUpdate({
                                    clipFolders: {
                                        ...project.clipFolders,
                                        [fromType]: fromList,
                                        [toType]: toList,
                                    },
                                });
                            }}
                            onRemoveClip={(type, index) => {
                                const list = [...(project.clipFolders[type] || [])];
                                if (index < 0 || index >= list.length) return;
                                onPushSelectionHistory(project);
                                list.splice(index, 1);
                                onProjectUpdate({
                                    clipFolders: {
                                        ...project.clipFolders,
                                        [type]: list,
                                    },
                                });
                            }}
                            onRemoveStockItem={(index) => {
                                const list = [...(project.stockTimestamps || [])];
                                if (index < 0 || index >= list.length) return;
                                onPushSelectionHistory(project);
                                list.splice(index, 1);
                                onProjectUpdate({ stockTimestamps: list });
                            }}
                            onClearVoiceover={() => {
                                onPushSelectionHistory(project);
                                onProjectUpdate({
                                    voiceoverFolderId: null,
                                    voiceoverMainFolderId: null,
                                    voiceoverMainFolderName: null,
                                });
                            }}
                            currentTitle={(project.titles || [''])[0] || ''}
                            stockMainFolderId={project.stockMainFolderId}
                            onAddStockFolder={(folder) => {
                                onPushSelectionHistory(project);
                                const already = (project.stockTimestamps || []).some((s: any) => s.folder_id === folder.id);
                                if (!already) {
                                    onProjectUpdate({
                                        stockMainFolderId: folder.id,
                                        stockMainFolderName: folder.name,
                                        stockTimestamps: [
                                            ...project.stockTimestamps,
                                            {
                                                start: '00:00',
                                                end: '00:10',
                                                folder_id: folder.id,
                                                folder_name: folder.name,
                                                source: 'drive',
                                            },
                                        ],
                                    });
                                } else {
                                    onProjectUpdate({
                                        stockMainFolderId: folder.id,
                                        stockMainFolderName: folder.name,
                                    });
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* AI PROMPT SECTION - SHOWN ONLY IN AI MODE (ai-image / ai-video) */}
            {isAiMode && (
                <AIPromptSection
                    description={project.aiPromptDescription || ''}
                    selectedStyle={project.aiPromptStyle || 'realistico'}
                    onDescriptionChange={(val) => onProjectUpdate({ aiPromptDescription: val })}
                    onStyleChange={(val) => onProjectUpdate({ aiPromptStyle: val })}
                />
            )}

            {/* DRIVE PICKER MODAL */}
            <DrivePickerModal
                open={drivePicker.open}
                onClose={closeDrivePicker}
                mode={drivePicker.type === 'stock' ? 'stock' : drivePicker.type === 'voiceover' ? 'voiceover' : 'clip'}
                title={
                    drivePicker.type === 'voiceover'
                        ? 'Seleziona Cartella Voiceover'
                        : drivePicker.type === 'stock'
                            ? 'Seleziona Cartella Stock'
                            : `Seleziona Cartella Clip (${(drivePicker.type || '').toUpperCase()})`
                }
                initialFolderId={
                    drivePicker.type === 'stock'
                        ? project.stockMainFolderId
                        : drivePicker.type === 'voiceover'
                            ? project.voiceoverMainFolderId
                            : project.clipMainFolderId
                }
                initialFolderName={
                    drivePicker.type === 'stock'
                        ? project.stockMainFolderName
                        : drivePicker.type === 'voiceover'
                            ? project.voiceoverMainFolderName
                            : project.clipMainFolderName
                }
                selectedGroup={project.youtubeGroup}
                masterFolderId={
                    drivePicker.type === 'stock'
                        ? STOCK_MASTER_ID
                        : drivePicker.type === 'voiceover'
                            ? VOICEOVER_MASTER_ID
                            : CLIP_MASTER_ID
                }
                onSelectFolder={handleSelectFolder}
                onSelectClip={handleSelectClip}
                onSelectClips={handleSelectClips}
            />

            {/* Remote Status Panel */}
            <RemoteStatusPanel
                progress={isGenerating ? { step: 'RUNNING', message: 'Generazione in corso...', progress: progress?.percent ?? 0 } : undefined}
                logs={progress?.logs ?? []}
            />

            {/* Generation Progress */}
            <GenerationProgress
                scripting={{ percent: progress?.percent ?? 0, status: progress?.status ?? '', logs: progress?.logs ?? [] }}
                voiceover={{ percent: 0, status: 'In attesa', logs: [] }}
                global={progress?.percent ?? 0}
            />

            {/* TITLE LINK HISTORY MODAL */}
            <TitleLinkHistoryModal
                open={isTitleModalOpen}
                onOpenChange={setTitleModalOpen}
                items={titleLinkHistory}
                onUseItem={(item, mode) => {
                    if (mode === 'title' || mode === 'both') appendTitleFromHistory(item.title);
                    if (mode === 'link' || mode === 'both') appendLinkToSourceContext(item.link);
                    handleMarkHistoryUsed(item.id);
                }}
                onDeleteItem={(id) => {
                    if (onDeleteTitleLink) {
                        onDeleteTitleLink(id);
                    }
                }}
                onClear={() => {
                    if (onClearTitleLinkHistory) {
                        onClearTitleLinkHistory();
                    }
                }}
            />

            {/* PROJECT HISTORY MODAL */}
            <ProjectHistoryModal
                open={isProjectModalOpen}
                onOpenChange={setProjectModalOpen}
                items={projectHistory}
                onApply={(item) => {
                    if (onApplyProjectHistory) {
                        onApplyProjectHistory(item);
                    }
                    if (setProjectModalOpen) {
                        setProjectModalOpen(false);
                    }
                }}
                onDelete={(id) => {
                    if (onDeleteProjectHistory) {
                        onDeleteProjectHistory(id);
                    }
                }}
                onClear={() => {
                    if (onClearProjectHistory) {
                        onClearProjectHistory();
                    }
                }}
            />
        </div>
    );
};