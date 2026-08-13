'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { driveAssetContentUrl, listDriveAssets, resolveEditorAssetUrl, uploadImage } from '@/lib/api';
import type { DriveAsset } from '@/lib/api';
import type { EditorSidebarTab } from '@/hooks/useEditorSidebar';

export const DEFAULT_DRIVE_ASSET_FOLDER = '1Ui83Bp9du7EFkROX6qdq3S0G-_sT5MmP';
export const CUSTOM_ASSETS_STORAGE_KEY = 'dark_editor_custom_assets';
export const DRIVE_ASSET_FOLDER_KEY = 'instaeditor.drive.asset-folder';

export interface CustomAsset {
  id: string;
  name: string;
  src: string;
}

export interface UseEditorAssetsReturn {
  customAssets: CustomAsset[];
  driveAssetFolder: string;
  setDriveAssetFolder: React.Dispatch<React.SetStateAction<string>>;
  driveAssets: DriveAsset[];
  driveAssetsLoading: boolean;
  driveAssetsError: string | null;
  customAssetInputRef: React.RefObject<HTMLInputElement>;
  refreshDriveAssets: () => Promise<void>;
  handleCustomAssetUpload: (file: File) => Promise<void>;
  removeCustomAsset: (id: string) => void;
  addDriveAssetToCanvas: (asset: DriveAsset) => void;
  addCustomAssetToCanvas: (asset: CustomAsset) => void;
}

/**
 * Owns the editor's asset sources:
 *   - Google Drive PNG library (folder id, paged listing, persisted folder).
 *   - Locally uploaded custom assets (persisted to localStorage).
 *
 * The Drive listing auto-refreshes whenever the (currently dormant) assets
 * sidebar tab becomes active. All I/O (network + storage) lives here so the
 * UI layer only deals with ready-made lists and add-to-canvas actions.
 */
export function useEditorAssets(sidebarTab: EditorSidebarTab): UseEditorAssetsReturn {
  const [customAssets, setCustomAssets] = useState<CustomAsset[]>([]);
  const [driveAssetFolder, setDriveAssetFolder] = useState(DEFAULT_DRIVE_ASSET_FOLDER);
  const [driveAssets, setDriveAssets] = useState<DriveAsset[]>([]);
  const [driveAssetsLoading, setDriveAssetsLoading] = useState(false);
  const [driveAssetsError, setDriveAssetsError] = useState<string | null>(null);
  const customAssetInputRef = useRef<HTMLInputElement>(null);

  const { addObject } = useEditorStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_ASSETS_STORAGE_KEY);
      if (stored) {
        setCustomAssets(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRIVE_ASSET_FOLDER_KEY);
      if (stored?.trim()) setDriveAssetFolder(stored.trim());
    } catch {
      // localStorage is optional.
    }
  }, []);

  const refreshDriveAssets = useCallback(async () => {
    const folder = driveAssetFolder.trim();
    if (!folder) return;
    setDriveAssetsLoading(true);
    setDriveAssetsError(null);
    try {
      const all: DriveAsset[] = [];
      let pageToken: string | undefined;
      let driveAccountId: number | undefined;
      for (let page = 0; page < 10; page += 1) {
        const response = await listDriveAssets(folder, driveAccountId, pageToken);
        driveAccountId = response.drive_account_id;
        all.push(...response.items);
        if (!response.next_page_token) break;
        pageToken = response.next_page_token;
      }
      setDriveAssets(all);
      try { localStorage.setItem(DRIVE_ASSET_FOLDER_KEY, folder); } catch { /* optional */ }
    } catch (error) {
      setDriveAssetsError(error instanceof Error ? error.message : 'Impossibile leggere gli asset Drive');
    } finally {
      setDriveAssetsLoading(false);
    }
  }, [driveAssetFolder]);

  useEffect(() => {
    if (sidebarTab === 'assets') void refreshDriveAssets();
  }, [refreshDriveAssets, sidebarTab]);

  const handleCustomAssetUpload = useCallback(async (file: File) => {
    const { setUploading } = useUIStore.getState();
    try {
      setUploading(true);
      const res = await uploadImage(file);
      const newAsset: CustomAsset = {
        id: uuidv4(),
        name: file.name.split('.')[0],
        src: resolveEditorAssetUrl(res.url),
      };
      const updated = [newAsset, ...customAssets];
      setCustomAssets(updated);
      localStorage.setItem(CUSTOM_ASSETS_STORAGE_KEY, JSON.stringify(updated));
      addToast({ type: 'success', message: 'Asset caricato con successo!' });
    } catch (err) {
      addToast({ type: 'error', message: 'Errore durante il caricamento' });
    } finally {
      setUploading(false);
    }
  }, [addToast, customAssets]);

  const removeCustomAsset = useCallback((id: string) => {
    const updated = customAssets.filter(a => a.id !== id);
    setCustomAssets(updated);
    localStorage.setItem(CUSTOM_ASSETS_STORAGE_KEY, JSON.stringify(updated));
    addToast({ type: 'info', message: 'Asset rimosso' });
  }, [addToast, customAssets]);

  const addDriveAssetToCanvas = useCallback((asset: DriveAsset) => {
    addObject({
      id: uuidv4(), type: 'image', name: asset.name.replace(/\.png$/i, ''),
      x: 100, y: 100, width: 300, height: 220, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false, src: driveAssetContentUrl(asset),
    });
    addToast({ type: 'success', message: `${asset.name} aggiunto al canvas` });
  }, [addObject, addToast]);

  const addCustomAssetToCanvas = useCallback((asset: CustomAsset) => {
    addObject({
      id: uuidv4(), type: 'image', name: asset.name,
      x: 100, y: 100, width: 250, height: 180, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false, src: asset.src,
    });
    addToast({ type: 'success', message: `Immagine ${asset.name} aggiunta!` });
  }, [addObject, addToast]);

  return {
    customAssets,
    driveAssetFolder,
    setDriveAssetFolder,
    driveAssets,
    driveAssetsLoading,
    driveAssetsError,
    customAssetInputRef,
    refreshDriveAssets,
    handleCustomAssetUpload,
    removeCustomAsset,
    addDriveAssetToCanvas,
    addCustomAssetToCanvas,
  };
}
