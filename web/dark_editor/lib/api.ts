// API facade for the InstaEditor.
//
// This file is now a pure barrel: every HTTP/transport detail lives in
// the domain clients under lib/api/ (httpClient, mediaClient,
// projectClient, driveClient, folderClient, presetClient,
// translationClient, utils, types). Consumers (stores, hooks,
// components) keep importing from '@/lib/api' — this facade re-exports
// the whole surface so call sites never touch the transport layer.
//
// Layout:
//   lib/api/httpClient.ts        — base URL, auth/CSRF fetch, RequestManager
//   lib/api/mediaClient.ts       — upload / filter / transform / export /
//                                  generate / upscale / remove-bg
//   lib/api/projectClient.ts     — project CRUD (+ ve_* session documents)
//   lib/api/driveClient.ts       — Google Drive PNG asset library
//   lib/api/folderClient.ts      — folder tree + project→folder binding
//   lib/api/presetClient.ts      — preset library CRUD
//   lib/api/translationClient.ts — AI text translation
//   lib/api/utils.ts             — URL / filename helpers
//   lib/api/types.ts             — shared wire-level types

export * from './api/httpClient';
export * from './api/utils';
export * from './api/mediaClient';
export * from './api/projectClient';
export * from './api/driveClient';
export * from './api/folderClient';
export * from './api/presetClient';
export * from './api/translationClient';
export * from './api/types';
