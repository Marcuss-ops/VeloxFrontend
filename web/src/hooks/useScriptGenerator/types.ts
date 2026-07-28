// useScriptGenerator/types.ts — Local types + the INITIAL_PROGRESS
// constant for the script-generation domain. Extracted from
// hooks/useScriptGenerator.ts (commit 1 of 3 in the spa-hooks refactor
// series). Upstream domain types (ProjectRef, GenerationProgress,
// GenerationResult) come from ../../../types/scriptGenerator (one level
// up from the sibling subdir). Behavior is byte-equivalent: the parent
// hook's public surface is preserved via `export type { ... }` re-exports
// from this module.

import type {
    ProjectRef,
    GenerationProgress,
    GenerationResult,
} from '../../types/scriptGenerator';

/**
 * A queued project with the titles to generate for it.
 */
export interface ProjectBatch {
    project: ProjectRef;
    queueIndex: number | null;
    titles: string[];
}

export interface UseScriptGeneratorOptions {
    apiBaseUrl?: string;
    onGenerationComplete?: (results: GenerationResult[]) => void;
    onError?: (error: Error) => void;
    onProgress?: (progress: GenerationProgress) => void;
}

export interface UseScriptGeneratorReturn {
    isGenerating: boolean;
    progress: GenerationProgress;
    logs: string[];
    generateScripts: (projects: ProjectBatch[], options?: BatchGenerationOptions) => Promise<GenerationResult>;
    cancelGeneration: () => void;
    clearLogs: () => void;
}

export interface BatchGenerationOptions {
    forceRemoteGeneration?: boolean;
    sourceContext?: string;
    duration?: string;
}

/**
 * Zero state for `progress` on hook mount. The status fields lean on
 * incoming `GenerationProgress` shape from ../../types/scriptGenerator
 * (the 'idle' / 'IDLE' enums are domain-stable).
 */
export const INITIAL_PROGRESS: GenerationProgress = {
    global: 0,
    scripting: { percent: 0, status: 'idle', logs: [] },
    voiceover: { percent: 0, status: 'idle', logs: [] },
    remote: { step: 'IDLE', message: 'In attesa...', progress: 0, isError: false },
};
