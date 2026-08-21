import type { Dispatch, SetStateAction } from 'react';
import type { TextObject } from '@/stores/editorStore';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import type {
  BatchVideo,
  CanvasSnapshot,
  LocalizedMetadata,
  RenderedVariant,
} from '@/components/editor/export/types';
import type { ThumbnailProjectDraft } from '@/lib/api/bff';

/**
 * Public surface returned by useExportDialog. Lives in its own module so the
 * hook stays lean and type-only consumers (PublishExportDialog) can import
 * the contract without dragging the hook implementation along.
 */
export interface UseExportDialogReturn {
  // dialog
  open: boolean;
  handleClose: () => void;
  // selection
  hasSelection: boolean;
  selectedOnly: boolean;
  setSelectedOnly: Dispatch<SetStateAction<boolean>>;
  // metadata
  youtubeTitle: string;
  setYoutubeTitle: Dispatch<SetStateAction<string>>;
  youtubeDescription: string;
  setYoutubeDescription: Dispatch<SetStateAction<string>>;
  isTranslatingMetadata: boolean;
  metadataTranslationError: string;
  translatedMetadata: Record<string, LocalizedMetadata>;
  translateCompletedMetadata: () => Promise<void>;
  // cover preview
  coverPreviewUrl: string;
  showCoverPreview: boolean;
  setShowCoverPreview: Dispatch<SetStateAction<boolean>>;
  snapshot: CanvasSnapshot | null;
  snapshotStale: boolean;
  draftCovers: Array<ThumbnailProjectDraft & { previewUrl?: string }>;
  selectedDraftId?: string;
  selectDraft: (draft?: ThumbnailProjectDraft & { previewUrl?: string }) => void;
  loadingDraftCovers: boolean;
  canvasSignature: string;
  // variants
  variantPreviews: Record<string, RenderedVariant>;
  isGeneratingPreviews: boolean;
  allSelectedVariantsReady: boolean;
  localizedMetadataByVideo: Record<string, { language: string; title: string; description: string }>;
  // uploads
  uploadResults: Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>;
  isApplyingToVideos: boolean;
  // variant editing
  editingVideoId: string | null;
  setEditingVideoId: Dispatch<SetStateAction<string | null>>;
  editingDraft: { title: string; description: string; coverText: string } | null;
  setEditingDraft: Dispatch<SetStateAction<{ title: string; description: string; coverText: string } | null>>;
  isSavingVariantEdit: boolean;
  saveVariantEdit: () => Promise<void>;
  // video targets
  privateVideos: BatchVideo[];
  visiblePrivateVideos: BatchVideo[];
  latestPrivateVideos: BatchVideo[];
  sortedVideos: BatchVideo[];
  selectedVideoIds: string[];
  setSelectedVideoIds: Dispatch<SetStateAction<string[]>>;
  selectedVideoCount: number;
  toggleVideo: (video: GroupVideo) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
  selectLatest: () => void;
  resetSelection: () => void;
  loadingPrivateVideos: boolean;
  youtubeTargetError: string | null;
  youtubeTargetWarnings: string[];
  targetVideos: BatchVideo[];
  isEditorSession: boolean;
  translationLayer: TextObject | undefined;
  isExporting: boolean;
  // actions
  handleExport: () => Promise<void>;
  handleDownloadAllLanguages: () => Promise<void>;
  handleApplyToSelectedVideos: () => Promise<void>;
}
