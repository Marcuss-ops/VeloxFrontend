/**
 * Script Components — organized by domain
 *
 * Subdirectories:
 * - tabs/     : Main tab views (Script, Stock, Clip, Voiceover, Drive Links)
 * - modals/   : Reusable modal dialogs
 * - titles/   : Title management components
 * - config/   : Configuration/selector components
 * - hooks/    : Custom React hooks
 * - data/     : Static data and constants
 * - editor/   : Script editor (ScriptCanvas, Toolbar)
 * - components/: Small shared UI components
 * - utils/    : Utility functions
 */

// Top-level components
export { CreatorStudioApp } from './CreatorStudioApp';
export { ActionBar } from './ActionBar';
export { AssetManagementHub } from './AssetManagementHub';
export { GenerationProgress } from './GenerationProgress';
export { ProjectQueue } from './ProjectQueue';
export { RemoteStatusPanel } from './RemoteStatusPanel';
export { SourceContext } from './SourceContext';
export { StockSuggestions } from './StockSuggestions';

// Tab views
export { ScriptTabApp } from './tabs/ScriptTabApp';
export { StockTabApp } from './tabs/StockTabApp';
export { ClipTabApp } from './tabs/ClipTabApp';
export { VoiceoverTabApp } from './tabs/VoiceoverTabApp';
export { DriveLinksTabApp } from './tabs/DriveLinksTabApp';

// Modals
export { DrivePickerModal } from './modals/DrivePickerModal';
export { TitleSelectionModal } from './modals/TitleSelectionModal';
export { TitleCategoriesModal } from './modals/TitleCategoriesModal';
export { TitleLinkHistoryModal } from './modals/TitleLinkHistoryModal';
export { ProjectHistoryModal } from './modals/ProjectHistoryModal';

// Titles
export { SuggestedTitles } from './titles/SuggestedTitles';
export { TitleListEditor } from './titles/TitleListEditor';

// Config
export { AssetConfig } from './config/AssetConfig';
export { ChannelLanguageSelector } from './config/ChannelLanguageSelector';
export { LanguageSelectors } from './config/LanguageSelectors';
export { StyleGroupSelector } from './config/StyleGroupSelector';

// Hooks
export { useScriptGenerator } from './hooks/useScriptGenerator';
export { useChannelLanguages } from './hooks/useChannelLanguages';

// Data
export { loadCategories } from './data/titleCategoriesData';

// Types
export type { VideoStyle, VideoProject } from './types';