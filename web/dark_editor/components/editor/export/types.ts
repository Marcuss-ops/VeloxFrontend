import type { RefObject } from 'react';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';

/** Canonical YouTube thumbnail document size used by every export variant. */
export const EXPORT_WIDTH = 1920;
export const EXPORT_HEIGHT = 1080;

/** A project-authorized YouTube target video. */
export type BatchVideo = GroupVideo;

export type LocalizedMetadata = { title: string; description: string };

export type CanvasSnapshot = {
  id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  blob: Blob;
  previewUrl: string;
  sha256: string;
  editorSignature: string;
};

export type RenderedVariant = {
  variantId: string;
  language: string;
  snapshotId: string;
  previewUrl: string;
  blob: Blob;
  sha256: string;
  title: string;
  description: string;
  translatedText: string;
};

export interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  canvasRef?: RefObject<any>;
}
