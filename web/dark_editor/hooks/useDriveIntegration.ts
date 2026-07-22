import { useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import {
  getDriveGroups,
  uploadToDrive,
  createDriveFolder,
  getCopertineFolders,
  DriveGroup,
  DriveLink,
} from '@/lib/api';

const COPERTINE_PARENT_ID = '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ';

export interface UseDriveIntegrationReturn {
  driveGroups: DriveGroup[];
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  loadingGroups: boolean;
  createProjectFolder: boolean;
  setCreateProjectFolder: (value: boolean) => void;
  copertineFolders: DriveLink[];
  selectedCopertina: string;
  setSelectedCopertina: (id: string) => void;
  loadingCopertine: boolean;
  driveUploadComplete: boolean;
  uploadedFileUrl: string;
  isUploadingToDrive: boolean;
  getCopertineOptions: () => DriveLink[];
  getCopertinaForGroup: (groupName: string) => DriveLink | undefined;
  handleDriveUpload: (
    blob: Blob,
    filename: string
  ) => Promise<{ success: boolean; fileId?: string; fileUrl?: string }>;
}

export function useDriveIntegration(): UseDriveIntegrationReturn {
  const { currentProject } = useProjectStore();
  const { addToast } = useUIStore();

  const [driveGroups, setDriveGroups] = useState<DriveGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [createProjectFolder, setCreateProjectFolder] = useState(true);

  const [copertineFolders, setCopertineFolders] = useState<DriveLink[]>([]);
  const [selectedCopertina, setSelectedCopertina] = useState<string>('');
  const [loadingCopertine, setLoadingCopertine] = useState(false);

  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadComplete, setDriveUploadComplete] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');

  const loadDriveGroups = async () => {
    setLoadingGroups(true);
    try {
      const groups = await getDriveGroups();
      setDriveGroups(groups);
      if (groups.length > 0 && !selectedGroup) {
        setSelectedGroup(groups[0].name);
      }
    } catch (error) {
      console.error('Failed to load Drive groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadCopertineFolders = async () => {
    setLoadingCopertine(true);
    try {
      const folders = await getCopertineFolders();
      setCopertineFolders(folders);
    } catch (error) {
      console.error('Failed to load copertine folders:', error);
    } finally {
      setLoadingCopertine(false);
    }
  };

  const getOrCreateProjectFolder = async (
    groupName: string,
    projectName: string
  ): Promise<string | undefined> => {
    const group = driveGroups.find((g) => g.name === groupName);
    if (!group?.folder_id) {
      try {
        const folder = await createDriveFolder(projectName);
        return folder.id;
      } catch (error) {
        console.error('Failed to create project folder:', error);
        return undefined;
      }
    }

    try {
      const folder = await createDriveFolder(projectName, group.folder_id);
      return folder.id;
    } catch (error) {
      console.error('Failed to create project subfolder:', error);
      return group.folder_id;
    }
  };

  const getCopertinaForGroup = useCallback(
    (groupName: string): DriveLink | undefined => {
      const normalizedName = groupName.toLowerCase();
      return copertineFolders.find((folder) => {
        const folderName = folder.name?.toLowerCase() || '';
        const folderLanguage = folder.language?.toLowerCase() || '';
        return (
          folderName === normalizedName ||
          folderLanguage === normalizedName ||
          folderName.includes(normalizedName) ||
          normalizedName.includes(folderName)
        );
      });
    },
    [copertineFolders]
  );

  const getCopertineOptions = useCallback(() => {
    return copertineFolders.filter(
      (folder) => folder.parentId === COPERTINE_PARENT_ID || folder.id === COPERTINE_PARENT_ID
    );
  }, [copertineFolders]);

  const handleDriveUpload = useCallback(
    async (blob: Blob, filename: string) => {
      if (!selectedGroup) {
        return { success: false };
      }

      setIsUploadingToDrive(true);
      try {
        let targetFolderId: string | undefined;
        const copertinaFolder = selectedCopertina
          ? copertineFolders.find((f) => f.id === selectedCopertina)
          : getCopertinaForGroup(selectedGroup);

        if (copertinaFolder) {
          targetFolderId = copertinaFolder.id;
          if (createProjectFolder && currentProject?.name) {
            try {
              const subfolder = await createDriveFolder(currentProject.name, copertinaFolder.id);
              targetFolderId = subfolder.id;
            } catch (error) {
              console.error('Failed to create subfolder in copertina:', error);
            }
          }
        } else if (createProjectFolder && currentProject?.name) {
          targetFolderId = await getOrCreateProjectFolder(selectedGroup, currentProject.name);
        } else {
          const group = driveGroups.find((g) => g.name === selectedGroup);
          targetFolderId = group?.folder_id;
        }

        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        const result = await uploadToDrive(file, targetFolderId);

        if (result.success) {
          setDriveUploadComplete(true);
          setUploadedFileUrl(result.web_view_link || '');
          addToast({ type: 'success', message: `Uploaded to Drive: ${filename}` });
          return { success: true, fileId: result.file_id, fileUrl: result.web_view_link };
        }
        throw new Error('Upload failed');
      } catch (error: any) {
        console.error('Drive upload failed:', error);
        addToast({
          type: 'error',
          message: `Drive upload failed: ${error?.message || 'Unknown error'}`,
        });
        return { success: false };
      } finally {
        setIsUploadingToDrive(false);
      }
    },
    [addToast, copertineFolders, createProjectFolder, currentProject?.name, driveGroups, getCopertinaForGroup, selectedCopertina, selectedGroup]
  );

  const refresh = async () => {
    await loadDriveGroups();
    await loadCopertineFolders();
  };

  // Expose a manual refresh so callers can load data when the dialog opens.
  useEffect(() => {
    void refresh();
  }, []);

  return {
    driveGroups,
    selectedGroup,
    setSelectedGroup,
    loadingGroups,
    createProjectFolder,
    setCreateProjectFolder,
    copertineFolders,
    selectedCopertina,
    setSelectedCopertina,
    loadingCopertine,
    driveUploadComplete,
    uploadedFileUrl,
    isUploadingToDrive,
    getCopertineOptions,
    getCopertinaForGroup,
    handleDriveUpload,
  };
}
