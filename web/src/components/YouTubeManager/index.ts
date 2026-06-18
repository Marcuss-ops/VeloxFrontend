/**
 * YouTube Manager Components
 * 
 * Esporta tutti i componenti per la gestione dei livestream:
 * - YouTubeLivestreamApp: Componente principale
 * - StreamCard: Card singolo stream con health e lifecycle
 * - StreamHealthIndicator: Indicatore visuale stato stream
 * - LifecycleControls: Controlli per transizioni di stato
 * - YouTubeAccountsManager: Gestione account YouTube e token
 * - DriveImporter: Importazione video da Google Drive
 */

// Main Component
export { YouTubeLivestreamApp, default as YouTubeLivestreamAppDefault } from './YouTubeLivestreamApp';

// Sub-components
export { StreamCard } from './StreamCard';
export { StreamHealthIndicator } from './StreamHealthIndicator';
export { LifecycleControls } from './LifecycleControls';

// Account & Drive Components
export { YouTubeAccountsManager } from './YouTubeAccountsManager';
export { DriveImporter } from './DriveImporter/DriveImporter';
export { DriveFileTree } from './DriveFileTree';

// Re-export types from API client
export type {
  Livestream,
  LivestreamConfig,
  LivestreamHealth,
  LivestreamStatus,
  LivestreamHealthStatus,
  LivestreamLatencyPreference,
  LivestreamProtocol,
  LivestreamStatusResponse,
  YouTubeAccountToken,
  YouTubeChannelGroup,
  DriveLink,
} from '../../lib/api';

// Re-export types from components
export type { 
  YouTubeAccount, 
  YouTubeGroup, 
  YouTubeManagerData 
} from './YouTubeAccountsManager';

export type { DriveLink as DriveLinkType } from './DriveImporter/hooks/useDriveImporter';

export type { DriveNode } from './DriveFileTree';
