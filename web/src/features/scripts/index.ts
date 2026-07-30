/**
 * features/scripts — Script Workspace feature
 *
 * Script generation, editing, and management.
 */

export { useScriptGenerator } from '@/hooks/useScriptGenerator';
export type {
  ProjectBatch,
  UseScriptGeneratorOptions,
  UseScriptGeneratorReturn,
  BatchGenerationOptions,
} from '@/hooks/useScriptGenerator';
export type {
  GenerationProgress,
  GenerationResult,
  GenerationResultItem,
  ProjectRef,
  ClipRefInput,
  StockTimestampInput,
  RemoteGenerationResult,
  VoiceoverPreviewItem,
} from '@/types/scriptGenerator';
