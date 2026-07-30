/**
 * features/content — InstaEdit Content feature
 *
 * Centralizza tutti i tipi, hook e componenti relativi alla
 * creazione e gestione contenuti.
 */

// Types
export type { VideoProject, VideoStyle, ScriptTabState, ClipFolders, StockTimestamp } from '@/types/studioTypes';
export { createDefaultVideoProject, DEFAULT_PROJECT } from '@/types/studioTypes';
export type { GenerationProgress, GenerationResult, ProjectRef } from '@/types/scriptGenerator';

// Hooks
export { useScriptGenerator } from '@/hooks/useScriptGenerator';
export type {
  ProjectBatch,
  UseScriptGeneratorOptions,
  UseScriptGeneratorReturn,
  BatchGenerationOptions,
} from '@/hooks/useScriptGenerator';
