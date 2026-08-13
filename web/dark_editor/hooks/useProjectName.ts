'use client';

import { useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useSyncDraftTitle } from '@/hooks/useSyncDraftTitle';

const NAME_ADJECTIVES = ['Vibrant', 'Neon', 'Cosmic', 'Electric', 'Stealth', 'Hyper', 'Sonic', 'Golden', 'Pixel', 'Astro'];
const NAME_NOUNS = ['Nebula', 'Blade', 'Vortex', 'Spark', 'Zenith', 'Echo', 'Pulse', 'Wave', 'Grid', 'Forge'];

export function generateRandomProjectName(): string {
  const randomAdj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const randomNoun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  const randomNumber = Math.floor(Math.random() * 99) + 1;
  return `${randomAdj}-${randomNoun}-${randomNumber}`;
}

export interface UseProjectNameReturn {
  projectName: string;
  handleProjectNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProjectNameBlur: () => void;
}

/**
 * useProjectName — owns the editor's project-name layer.
 *
 * Wires the rename pill to the project store, replaces an empty name on
 * blur with a generated fallback (with a toast), and keeps the InstaEdit
 * draft title in lock-step with the pill via useSyncDraftTitle.
 */
export function useProjectName(projectId: string): UseProjectNameReturn {
  const { currentProject, updateProjectName } = useProjectStore();
  const { addToast } = useUIStore();

  const handleProjectNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateProjectName(e.target.value);
  }, [updateProjectName]);

  const handleProjectNameBlur = useCallback(() => {
    if (!currentProject?.name?.trim()) {
      const randomName = generateRandomProjectName();
      updateProjectName(randomName);
      addToast({ type: 'info', message: `Empty name? Let's call it "${randomName}"! ✨` });
    }
  }, [addToast, currentProject?.name, updateProjectName]);

  // Sync the rename pill to the InstaEdit draft (partial PUT, title
  // only, debounced) so the Copertine hub card shows the operator's
  // real project name instead of the auto-generated draft title.
  useSyncDraftTitle(projectId, currentProject?.name ?? '');

  return {
    projectName: currentProject?.name ?? '',
    handleProjectNameChange,
    handleProjectNameBlur,
  };
}
