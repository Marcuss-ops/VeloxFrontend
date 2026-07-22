# Dependency & Coupling Audit Report

**Date:** 2026-07-22  
**Scope:** `web/src` (Velox web app) and `web/dark_editor` (Next.js editor)  
**Methodology:** Static analysis of TypeScript/TSX import graph, plus manual review of high fan-in / high coupling files.

## 1. Executive Summary

The codebase contains two applications:

| App | Files | Internal dependency edges | File-level cycles |
| --- | --- | --- | --- |
| `web/src` | 262 | 55 | 0 |
| `web/dark_editor` | 116 | 141 | 0 |

No circular file-level dependencies were detected, but **coupling is highly concentrated** in a few files and stores. The most fragile area is the dark_editor, where a single page (`app/editor/[id]/page.tsx`) orchestrates 11 internal modules and the `editorStore` is imported by 21 different consumers. In the web app, `src/lib/api/index.ts` acts as a central hub with 10 inbound dependencies, turning the API barrel into an implicit architectural bottleneck.

## 2. Hotspot Matrix (Frequency of Change × Complexity/Fragility)

Files are ranked using the matrix from the project’s refactoring checklist: high change-frequency + high complexity/fragility = **absolute priority**.

### 🔥 Absolute Priority (high coupling + central to many features)

| File | App | Internal imports (out) | Fan-in (in) | Risk |
| --- | --- | --- | --- | --- |
| `dark_editor/app/editor/[id]/page.tsx` | dark_editor | 11 | – | Page orchestrates stores, hooks, dialogs, sidebar, toolbar, keyboard, drag-drop, save/loader. Any change ripples everywhere. |
| `dark_editor/stores/editorStore.ts` | dark_editor | – | 21 | Giant store mixing canvas state, history, layers, filters, text/shape effects, AI actions. |
| `dark_editor/stores/uiStore.ts` | dark_editor | – | 17 | UI store mixes tool state, panel visibility, dialogs, toast, loading, crop editing. |
| `dark_editor/components/editor/ExportDialog.tsx` | dark_editor | 7 | – | Dialog contains BFF/Velox submission logic, Drive integration, export operation and UI state. |
| `dark_editor/components/editor/sidebar/EditorSidebar.tsx` | dark_editor | 8 | – | Sidebar owns preloaded-asset constants, upload logic, localStorage, template handling and tab rendering. |
| `web/src/lib/api/index.ts` | web | – | 10 | Mega-barrel re-exporting all API modules; becomes a coupling magnet. |
| `web/src/lib/utils.ts` | web | – | 6 | Mixes Tailwind `cn()` helper with YouTube-specific utilities, news persistence and studio logic. |

### ️ Medium Priority

| File | App | Issue |
| --- | --- | --- |
| `dark_editor/lib/api.ts` | dark_editor | 12 inbound; likely a second mega-barrel/API facade. |
| `dark_editor/stores/projectStore.ts` | dark_editor | 9 inbound; project lifecycle state used across hooks and pages. |
| `web/src/components/ui/dialog.tsx` | web | 4 inbound; generic UI component imported by domain modals. |
| `web/src/lib/api/authApi.ts` | web | 4 inbound; authentication API tightly coupled to providers. |
| `web/src/lib/api/veloxApi.ts` | web | 4 inbound; Velox-specific API reused in views and hooks. |
| `web/src/lib/api/socialDestinationsApi.ts` | web | 4 inbound; social destinations API used by hooks and components. |

### ✅ Low Priority

Most view/components in `web/src` have 1–3 outgoing imports and follow a reasonable layered structure. They can be left as-is unless touched for other reasons.

## 3. Architectural Smells

### 3.1 Fragility / Coupling

* **God Stores:** `editorStore` contains canvas state, undo/redo history, layer management, filters, advanced text effects, shape effects and an AI background-removal action. It is a single point of failure.
* **God Page / Orchestrator Bloat:** `dark_editor/app/editor/[id]/page.tsx` imports 11 internal modules and implements UI details (random name generator, drag-and-drop overlay, project name input) that should live in smaller, focused components or hooks.
* **Mega API Barrel:** `web/src/lib/api/index.ts` re-exports every API module and also builds a default combined client. This encourages components to import from a single giant module rather than from the specific API they need.

### 3.2 Complexity / Maintainability

* **Primitive Obsession / Bloated Type:** `CanvasObject` in `editorStore.ts` carries dozens of optional fields for images, text, shapes, filters, effects, cropping, etc. It is used as a catch-all domain model.
* **Feature Envy in Dialogs:** `ExportDialog` directly calls `createVeloxProject` and `createVeloxJob` from the BFF, mixing presentation with cross-boundary orchestration.
* **Mixed Responsibilities:** `web/src/lib/utils.ts` contains UI class merging (`cn`), YouTube URL parsing, news persistence (`localStorage`) and studio project helpers.

### 3.3 Global State

* **Store Sprawl:** dark_editor has separate stores (`editorStore`, `uiStore`, `projectStore`) but each of them is too broad. `uiStore` alone owns tool mode, grid, panels, dialogs, toast and loading flags.
* **LocalStorage in Components:** `EditorSidebar` directly reads/writes `localStorage` for custom assets, coupling UI logic to persistence.

### 3.4 I/O Boundaries

* **API imports inside stores:** `editorStore.removeBackground()` dynamically imports `@/lib/api`. The store should not know about network calls.
* **Hooks calling BFF directly:** `ExportDialog` and `EditorSidebar` call API functions directly instead of going through a thin application/use-case layer.

## 4. Decoupling Plan

### Phase 1 – Immediate (highest ROI, small commits on main)

1. **Split `web/src/lib/api/index.ts`**
   * Remove the default combined `apiClient` export.
   * Encourage consumers to import from the specific module (e.g. `@/lib/api/veloxApi`).
   * Keep only a minimal public-API surface in `index.ts`.
2. **Extract UI-only utilities from `web/src/lib/utils.ts`**
   * Move `cn` to `lib/utils/cn.ts`.
   * Move YouTube/news/studio helpers to `lib/youtube/utils.ts` or domain modules.
3. **Reduce page orchestration in `dark_editor/app/editor/[id]/page.tsx`**
   * Extract `ProjectNameEditor`, `DragDropOverlay`, `EditorLayout` into separate components.
   * Leave the page responsible only for wiring layout and loading states.

### Phase 2 – Structural (medium effort)

4. **Decompose `editorStore`**
   * `canvasStore`: objects, selection, zoom/pan.
   * `historyStore`: undo/redo patches.
   * `layerStore`: layer ordering.
   * `effectsStore`: filters, text/shape effects.
   * Keep `editorStore` only as a thin façade if needed for backward compatibility.
5. **Slim `uiStore`**
   * Extract `toastStore` (toasts).
   * Extract `dialogStore` (export/AI/feed-preview visibility).
   * Extract `toolStore` (active tool, grid, snap).
6. **Introduce use-case hooks in dark_editor**
   * `useExportJob()` to wrap `createVeloxProject`/`createVeloxJob`.
   * `useAssetUpload()` to wrap `uploadImage` + localStorage persistence.
   * `useBackgroundRemoval()` to move AI logic out of the store.

### Phase 3 – Hardening

7. **Refactor `CanvasObject` into discriminated unions**
   * `ImageObject`, `TextObject`, `RectObject`, `CircleObject`, etc.
   * Remove dozens of optional fields from a single type.
8. **Apply hexagonal/Clean Architecture at module boundaries**
   * Define ports in `features/`, implement adapters in `infrastructure/`.
   * Keep components free of direct API imports.
9. **Add automated coupling guardrails**
   * Dependency-cruiser or madge in CI to fail on circular dependencies and layer violations.
   * Enforce lint rule: no direct import from `lib/api` inside `stores/`.

## 5. First Action to Take on `main`

**Commit 1:** Split the `cn` utility out of `web/src/lib/utils.ts` into `web/src/lib/utils/cn.ts`, update all `cn` imports, run `npm run lint` and `npm run test`, then commit to `main`.

This is the safest, smallest change that immediately reduces the surface area of a mixed-responsibility utility file and establishes the pattern for further domain separation.

## 6. Metrics Snapshot

```text
web/src
  files: 262
  internal edges: 55
  top fan-in: src/lib/api/index.ts (10)
  top coupling: VeloxJobDetailView.tsx, useDestinationSelector.ts/ test.ts, DestinationSelector.tsx (3 out)

dark_editor
  files: 116
  internal edges: 141
  top fan-in: stores/editorStore.ts (21), stores/uiStore.ts (17)
  top coupling: app/editor/[id]/page.tsx (11 out), AIDialog.tsx (8), EditorSidebar.tsx (8)
```
