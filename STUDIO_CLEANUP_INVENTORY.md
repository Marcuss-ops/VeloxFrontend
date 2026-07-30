# Studio Cleanup Inventory

Generated: 2026-07-30
Purpose: Classify every file in `web/src/components/Script/` and every reference to the old Creator Studio before removing the legacy UI.

## rg scan: all matches for old Studio patterns

```
web/src/components/Script/index.ts:17:export { CreatorStudioApp }
web/src/components/Script/index.ts:27:export { ScriptTabApp }
web/src/components/Script/index.ts:28:export { StockTabApp }
web/src/components/Script/index.ts:29:export { ClipTabApp }
web/src/components/Script/index.ts:30:export { VoiceoverTabApp }
web/src/components/Script/index.ts:31:export { DriveLinksTabApp }
web/src/components/Script/CreatorStudioApp.tsx:21:export const CreatorStudioApp
web/src/components/Script/CreatorStudioApp.tsx:46:studio-tab-change
web/src/components/Script/CreatorStudioApp.tsx:50:studio-tab-change
web/src/components/Script/tabs/ScriptTabApp.tsx:65:ScriptTabApp
web/src/components/Script/tabs/ScriptTabApp.tsx:197:studio-tab-change
web/src/components/Script/tabs/VoiceoverTabApp.tsx:44:VoiceoverTabApp
web/src/components/Script/tabs/StockTabApp.tsx:65:StockTabApp
web/src/components/Script/tabs/ClipTabApp.tsx:40:ClipTabApp
web/src/components/Script/tabs/DriveLinksTabApp/DriveLinksTabApp.tsx:6:DriveLinksTabApp
web/src/components/Panorama/PanoramaToPost.tsx:39:/creator_studio_app?job_id=...
web/e2e/smoke.spec.ts:53:/creator_studio_app
web/src/app/routes.ts:6:creatorStudio: '/creator_studio_app'
web/src/app/router.tsx:36:lazy import CreatorStudioApp
web/src/app/router.tsx:89:/creator_studio_app comment
web/src/app/router.tsx:124:<CreatorStudioApp />
```

## Classification

### 🔴 DELETE — Components used ONLY by CreatorStudioApp (zero external imports outside Script/)

| File | Reason |
|------|--------|
| `CreatorStudioApp.tsx` | Container principale; rimosso da router |
| `index.ts` | Barrel exports; non più necessario |
| `tabs/ScriptTabApp.tsx` | Solo da CreatorStudioApp |
| `tabs/VoiceoverTabApp.tsx` | Solo da CreatorStudioApp |
| `tabs/ClipTabApp.tsx` | Solo da CreatorStudioApp |
| `tabs/StockTabApp.tsx` | Solo da CreatorStudioApp |
| `tabs/DriveLinksTabApp/*.tsx` | Solo da CreatorStudioApp |
| `tabs/ClipDisplay.tsx` | Solo da ClipTabApp |
| `tabs/StockFilters.tsx` | Solo da StockTabApp |
| `tabs/StockSearchPanel.tsx` | Solo da StockTabApp |
| `tabs/VoiceoverConfigPanel.tsx` | Solo da VoiceoverTabApp |
| `tabs/VoiceoverOptionsPanel.tsx` | Solo da VoiceoverTabApp |
| `tabs/voiceoverTypes.ts` | Solo da VoiceoverTabApp |
| `config/*` (5 files) | Solo da CreatorStudioApp/tabs |
| `editor/*` (8 files) | Solo da ScriptTabApp |
| `hooks/useProjectQueue.ts` | Solo da ProjectQueue |
| `hooks/useScriptGenerator.ts` | Solo da ScriptTabApp (diverso da `src/hooks/useScriptGenerator.ts`) |
| `ActionBar.tsx` | Vecchia UI, zero import esterni |
| `AssetManagementHub.tsx` | Vecchia UI, zero import esterni |
| `GenerationProgress.tsx` | Vecchia UI, zero import esterni |
| `ProjectQueue.tsx` | Vecchia UI, zero import esterni |
| `RemoteStatusPanel.tsx` | Vecchia UI, zero import esterni |
| `SourceContext.tsx` | Vecchia UI, zero import esterni |
| `StockSuggestions.tsx` | Vecchia UI, zero import esterni |
| `modals/ProjectHistoryModal.tsx` | Solo da ScriptTabApp |
| `modals/TitleLinkHistoryModal.tsx` | Solo da ScriptTabApp |
| `modals/TitleCategoriesModal/*` (5 files) | Zero import esterni |
| `components/*` (8 files) | Solo da tab interni |
| `titles/SuggestedTitles.tsx` | Solo da ScriptTabApp |
| `titles/TitleListEditor.tsx` | Solo da ScriptTabApp |
| `utils/clipTab.ts` | Solo da ClipTabApp |
| `utils/driveLinks.ts` | Solo da DriveLinksTabApp |
| `utils/stockTab.ts` | Solo da StockTabApp |
| `utils/voiceoverTab.ts` | Solo da VoiceoverTabApp |
| `utils/titleCategories.ts` | Solo da TitleCategoriesModal |
| `utils/index.ts` | Barrel per utils |

### 🟡 MOVE/REUSE — Imported by external files, must be relocated before deletion

| File | External consumer(s) | Move to |
|------|---------------------|---------|
| `types.ts` | `src/app/providers/ScriptProvider.tsx` (VideoProject, createDefaultVideoProject), `src/lib/utils.ts` | `src/types/studioTypes.ts` |
| `data/titleCategoriesData.ts` | `src/app/views/CalendarModal/useCalendarState.ts` (loadCategories) | `src/lib/api/titleCategories.ts` |
| `modals/TitleSelectionModal.tsx` | `src/app/views/CalendarModal/CalendarModalMain.tsx` | `src/components/shared/TitleSelectionModal.tsx` |
| `modals/DrivePickerModal/*` (5 files) | `src/components/Drive/utils/drivePicker.ts` | `src/components/Drive/DrivePickerModal/` |

### 🟢 SHARED — Files OUTSIDE Script/ that need modification (not deletion)

| File | Action |
|------|--------|
| `src/app/routes.ts` | Remove `creatorStudio: '/creator_studio_app'` |
| `src/app/router.tsx` | Remove lazy import + route for CreatorStudioApp; add redirect `/creator_studio_app/*` → `/dashboard-channels` |
| `src/app/shell/Navbar.tsx` | Remove "Studio" button |
| `src/app/providers/ScriptProvider.tsx` | Update import from `components/Script/types` to new location after MOVE |
| `src/components/Panorama/PanoramaToPost.tsx` | Change hardcoded `/creator_studio_app?job_id=...` to `/dashboard-channels` or appropriate new target |
| `web/e2e/smoke.spec.ts` | Replace `/creator_studio_app` navigation with `/dashboard-channels` |

### ⚪ NOT TOUCHED — Valid, independent features

| File/Directory | Notes |
|----------------|-------|
| `src/hooks/useScriptGenerator.ts` | Project-level hook, does NOT import from Script/ |
| `src/types/scriptGenerator.ts` | Shared types |
| `src/utils/scriptGenerator.ts` | Shared utils |
| `src/components/Panorama/PanoramaApp.tsx` | Independent Panorama feature, used by DashboardView |
| `src/app/views/DashboardView.tsx` | Uses PanoramaApp, not Script |
| All backend API endpoints | NOT modified — only removing old frontend UI shell |

## File count summary

| Classification | Count |
|----------------|-------|
| DELETE | ~55 files under `components/Script/` |
| MOVE/REUSE | 4 entries (types.ts, titleCategoriesData.ts, TitleSelectionModal.tsx, DrivePickerModal/) |
| SHARED | 5 files to modify |
| NOT TOUCHED | Everything else |
