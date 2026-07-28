// API client for Dark Editor V2
// All endpoints route through the InstaEdit BFF at /api/v1/editor
// which proxies to the Velox master. The browser stays on the same
// origin so the InstaEdit session cookie + CSRF double-submit are
// preserved.

// After commit 8 every HTTP verb is consumed exclusively by the
// per-domain client modules under lib/api/<domain>Client.ts. The
// raw-fetcher import that used to live here emptied out with
// driveClient.ts and was deliberately removed — new HTTP calls go
// directly through `'./api/httpClient'`.

// Types live in lib/api/types.ts. We import all 17 here because the
// `export type { ... }` block immediately below needs them in local
// scope (the `export type { X } from './m'` form does NOT bind the
// names locally — same TS2304 footgun we fixed in commit 1).
//
// Even though most of these types are no longer referenced by the
// surviving client wrappers in api.ts itself, the back-compat barrel
// must keep re-exporting all 17 names because 19 call sites
// (e.g. app/DarkEditorHome.tsx's `import { type Project }`) import
// them through '@/lib/api'. Following the refactor plan, new code
// should import these directly from '@/lib/api/types'.
import type {
  UploadResponse,
  FilterRequest,
  FilterResponse,
  TransformRequest,
  ExportRequest,
  GenerateRequest,
  GenerateResponse,
  UpscaleRequest,
  UpscaleResponse,
  RemoveBgRequest,
  RemoveBgResponse,
  RemoveBgStatusResponse,
  Project,
  Preset,
  ProjectFolder,
  DriveGroup,
  DriveFile,
  DriveLink,
} from './api/types';

export type {
  UploadResponse,
  FilterRequest,
  FilterResponse,
  TransformRequest,
  ExportRequest,
  GenerateRequest,
  GenerateResponse,
  UpscaleRequest,
  UpscaleResponse,
  RemoveBgRequest,
  RemoveBgResponse,
  RemoveBgStatusResponse,
  Project,
  Preset,
  ProjectFolder,
  DriveGroup,
  DriveFile,
  DriveLink,
};

// URL helpers live in lib/api/utils.ts — re-exported here for
// back-compat so existing call sites (`@/lib/api`) keep working.
export {
  extractFilenameFromPath,
  getTempFileUrl,
  getProjectFileUrl,
} from './api/utils';

// Media client lives in lib/api/mediaClient.ts — re-exported here
// for back-compat so existing call sites (`@/lib/api`) keep working.
export {
  uploadImage,
  applyFilter,
  transformImage,
  exportImage,
  generateImage,
  upscaleImage,
  removeBackground,
  getBackgroundRemovalStatus,
} from './api/mediaClient';

// Project client lives in lib/api/projectClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working.
export {
  listProjects,
  getProject,
  saveProject,
  deleteProject,
} from './api/projectClient';





// Preset client lives in lib/api/presetClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working.
export {
  listPresets,
  getPreset,
  savePreset,
  updatePreset,
  deletePreset,
} from './api/presetClient';



// Folder client lives in lib/api/folderClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working.
export {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  assignProjectToFolder,
} from './api/folderClient';// Drive client lives in lib/api/driveClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working. The 2 module-private lookup-table constants that drive
// the Copertine/category helpers stay private inside driveClient.ts
// (they were never part of the original api.ts barrel surface).
export {
  getDriveGroups,
  getDriveFiles,
  uploadToDrive,
  createDriveFolder,
  listDriveFolders,
  getDriveLinks,
  getDriveLinksByCategory,
  getCopertineFolders,
} from './api/driveClient';
