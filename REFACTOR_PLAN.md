# REFACTOR_PLAN.md

> **Piano di refactor dettagliato per i 19 file più lunghi in LOC del workspace `company`.**
>
> - **Data generazione**: 2026-07-28
> - **Progetti coinvolti**: `VeloxFrontend` (13 file) + `Chronon3d` (6 file)
> - **Regola operativa**: ✅ **SOLO `main`** · 1 commit per estrazione · push immediato dopo ogni commit · NO branch.
>
> ⚠️ Il duplicato `VeloxEditiingg/VeloxFrontend/web/dark_editor/` deve essere sincronizzato a fine refactor (vedi §10).

---

## 0. Sintesi Esecutiva

| Metrica | Valore |
|---|---|
| File identificati | 19 |
| LOC totali target | ~13,800 |
| Soglia per file dopo refactor | **≤ 250 LOC** (preferibilmente ≤ 200) |
| Nuovi moduli previsti | ~60 |
| Commit previsti totali | ~70 (3-4 per file) |
| Tempo stimato | 2 settimane (1 fase/giorno) |

### Distribuzione per progetto

| Progetto | File | LOC totali | Rischio dominante |
|---|---|---|---|
| `VeloxFrontend/web/dark_editor/` | 13 | ~8,400 | Store Zustand centrale (`editorStore.ts` ha 44+ call site) |
| `Chronon3d/tools/` | 6 | ~4,500 | Inserters DB + Flask routes monolitiche |

---

## 1. Principi Guida

1. **Nessuna regressione**: ogni commit deve passare build + test esistenti.
2. **Coesione prima, granularità poi**: un modulo estratto ha uno *scope* chiaro (entità, layer, dominio).
3. **Dipendenze minime**: max 3-5 importazioni per nuovo modulo.
4. **Backward compatibility**: l'API esportata dal file originale resta come *facade* finché tutti i call site sono migrati.
5. **No duplicazione**: ogni `def`/`export`/`class` esiste in un solo posto.
6. **Commits atomici con push immediato su `main`**:
   - **1 commit = 1 estrazione**
   - **Push dopo ogni commit**
   - Messaggio: `refactor(<area>): extract <module> from <file>`
   - Body: `Moved N functions (X LOC) to <new-path>. Back-compat re-export maintained.`
7. **Branch policy**: ❌ MAI creare branch. Lavoro sempre su `main`.

---

## 2. Blocchi condivisi fra più file

### 2.1 HTTP core (dragato da `api.ts` + `api/bff.ts`)

| Nuovo modulo | LOC | Contenuto |
|---|---|---|
| `web/dark_editor/api/core/httpClient.ts` | ~80 | `buildUrl`, `RequestManager`, AbortController, retry |
| `web/dark_editor/api/core/cookies.ts` | ~40 | `getCookie` shared |
| `web/dark_editor/api/core/types.ts` | ~60 | interface types condivise |
| `web/dark_editor/api/core/fetcher.ts` | ~50 | `bffPost` (da `api/bff.ts`) |

### 2.2 Effetti / Canvas pool (da `advancedEffects.ts`)

| Nuovo modulo | LOC |
|---|---|
| `web/dark_editor/lib/effects/types.ts` | ~70 |
| `web/dark_editor/lib/effects/canvasPool.ts` | ~30 |
| `web/dark_editor/lib/effects/textEffects.ts` | ~220 |
| `web/dark_editor/lib/effects/shapeEffects.ts` | ~140 |
| `web/dark_editor/lib/effects/appliers.ts` | ~30 |

---

## 3. VeloxFrontend — Dark Editor (13 file)

### 3.1 `stores/editorStore.ts` (679 LOC) — 🔴 CRITICAL

**Ruolo**: store globale Zustand per stato canvas (oggetti, undo/redo via `immer`, filtri, effetti AI).

**Call site** (44+): `Canvas.tsx`, `CanvasObjectNode.tsx`, `PropertiesPanel.tsx`, `LayersPanel.tsx`, `DropShadowPanel.tsx`, `FilterPanel.tsx`, `CollaborationPanel.tsx`, `VersioningPanel.tsx`, `AIDialog.tsx`, `PresetPanel.tsx`, `AdvancedTemplatePanel.tsx`, `EditorSidebar.tsx`, `ToolbarDock.tsx`, `app/editor/[id]/page.tsx`, hooks `useObjectsArray`, `useDragDropUpload`, `useProjectSave`, `useKeyboard`, `useProjectLoader`, `useEditorTemplates`, e tutti i 5 store derivati (`templateStore`, `projectStore`, `presetStore`, `versioningStore`).

**Test impact**: 5 file `__tests__/*editorStore*` accedono `getObjectsArrayFromState`.

**Estrazioni**:

| Modulo | LOC | Contenuto |
|---|---|---|
| `stores/slices/historySlice.ts` | ~120 | `produceWithPatches`, `applyPatches`, undo/redo, `enablePatches` import |
| `stores/slices/objectSlice.ts` | ~180 | CRUD oggetti, `getObjectsArrayFromState`, selection, layering |
| `stores/slices/effectsSlice.ts` | ~150 | filters, blur, drop shadow, text formatting |
| `stores/editorStore.ts` | ~120 | compose + facade che re-esporta dagli slices + `CanvasObject` type |

**Sequenza commit**:
1. `refactor(stores): extract historySlice from editorStore`
2. `refactor(stores): extract objectSlice from editorStore`
3. `refactor(stores): extract effectsSlice from editorStore`
4. `refactor(stores): re-export legacy types from editorStore (compat)`
5. *(post-migrazione, +1 settimana)* `chore(stores): drop compat re-exports`

**Rischi**:
- ⚠️ `get()` cross-slice può rompere se uno slice non vede lo stato dell'altro → usare *selector factories* con `set/get` typed.
- ⚠️ `__tests__/editorStoreHelpers.test.ts` accede direttamente `getObjectsArrayFromState` → mantenuto in `objectSlice.ts` + re-export.
- ⚠️ I 5 store derivati (`templateStore`, `projectStore`, `presetStore`, `versioningStore`) importano `CanvasObject` da `.`/`./editorStore` → type alias resta nello stesso file.

---

### 3.2 `stores/templateStore.ts` (721 LOC) — 🟡 HIGH

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `data/defaultTemplates.ts` | ~250 (hardcoded Title, Telegiornale, Rap, …) |
| `lib/templateEngine.ts` | ~150 (regex `{{var}}`, `applyTemplate`) |
| `stores/templateStore.ts` | ~180 |

**Rischi**: persist middleware deve continuare a funzionare con subset ridotto. Verificare migrations `version`.

---

### 3.3 `lib/api.ts` (460 LOC) — 🔴 CRITICAL

**Estrazioni** (Repository Pattern):

| Modulo | LOC | Copertura |
|---|---|---|
| `api/mediaClient.ts` | ~120 | upload, export, generate, upscale, removeBackground, applyFilter, transformImage |
| `api/projectClient.ts` | ~100 | listProjects, getProject, saveProject, deleteProject |
| `api/presetClient.ts` | ~100 | listPresets, getPreset, savePreset, update, delete |
| `api/folderClient.ts` | ~50 | listFolders, CRUD folder, assignProjectToFolder |
| `api/driveClient.ts` | ~80 | getDriveGroups, getDriveFiles, uploadToDrive, listDriveFolders, getCopertineFolders |
| `api/types.ts` | ~60 | tutte le interface |
| `lib/api.ts` (barrel) | ~20 | re-export |

**Sequenza**: 7 commit, uno per modulo + barrel finale.

---

### 3.4 `lib/api/bff.ts` (578 LOC) — 🔴 CRITICAL

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `api/bff/auth.ts` | ~30 (`getMe`) |
| `api/bff/youtube.ts` | ~150 (publishEditorSession, translations draft, YouTube types) |
| `api/bff/projects.ts` | ~60 (createVeloxProject, pollEditorSession) |
| `api/bff/upload.ts` | ~60 (uploadMediaAsset, updateEditorSessionThumbnail) |
| `api/bff/socialDestinations.ts` | ~30 |
| `api/bff/broadcast.ts` | ~60 (PUBLISH_CHANNEL_NAME, publishBroadcast) |
| `api/bff/types.ts` | ~80 (interface types) |
| `lib/api/bff.ts` (barrel) | ~30 |

---

### 3.5 `lib/advancedEffects.ts` (482 LOC) — 🟢 MEDIUM

→ vedi §2.2.

---

### 3.6 `components/editor/ExportDialog.tsx` (863 LOC) — 🟡 HIGH

**Stato attuale**: form export (form state, validazioni, salvataggio draft, multi-step UI, traduzioni).

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `components/editor/export/PrivacyOptions.ts` | ~30 |
| `components/editor/export/SuggestedLangs.ts` | ~20 |
| `components/editor/export/formState.ts` | ~50 (`EMPTY_FORM`, `FormState`) |
| `components/editor/export/TranslationRowItem.tsx` | ~120 |
| `components/editor/export/ExportStepIndicator.tsx` | ~80 |
| `components/editor/ExportDialog.tsx` | ~400 |

*Nota*: `FormatQualitySection`, `CanvasInfoSection`, `ExportFooter`, `useExportFormatQuality` sono **già** estratti — verificare copertura.

---

### 3.7 `components/editor/AdvancedTemplatePanel.tsx` (587 LOC) — 🟡 HIGH

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `components/editor/templates/TemplateCard.tsx` | ~120 |
| `components/editor/templates/TemplateListItem.tsx` | ~90 |
| `components/editor/templates/VariableInput.tsx` | ~40 |
| `components/editor/AdvancedTemplatePanel.tsx` | ~300 |

---

### 3.8 `components/editor/CollaborationPanel.tsx` (556 LOC) — 🟢 MEDIUM

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `components/editor/collab/TaskCard.tsx` | ~80 |
| `components/editor/collab/colors.ts` | ~30 (priority/status color maps) |
| `components/editor/collab/CommentSection.tsx` | ~120 |
| `components/editor/collab/UserPresence.tsx` | ~80 |
| `components/editor/CollaborationPanel.tsx` | ~250 |

---

### 3.9 `components/editor/Canvas.tsx` (544 LOC) — 🔴 CRITICAL

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `hooks/useCanvasStage.ts` | ~150 |
| `hooks/useCanvasSelection.ts` | ~120 |
| `hooks/useCanvasKeyboard.ts` | ~80 |
| `components/editor/Canvas.tsx` | ~200 |

---

### 3.10 `components/editor/canvas/CanvasRenderers.tsx` (816 LOC) — 🔴 CRITICAL

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `canvas/TextEditorOverlay.tsx` | ~120 |
| `canvas/DocumentCropOverlay.tsx` | ~200 |
| `canvas/CropSelectionOverlay.tsx` | ~170 |
| `canvas/ImageRenderer.tsx` | ~210 |
| `canvas/GridOverlay.tsx` | ~30 |
| `canvas/ObjectRenderer.tsx` | ~120 |

**Rischi**: performance rendering. Preservare `React.memo` + reference Konva intatti.

---

### 3.11 `components/editor/sidebar/EditorSidebar.tsx` (470 LOC) — 🟡 HIGH

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `sidebar/SidebarTabRouter.tsx` | ~80 |
| `sidebar/SidebarAssets.tsx` | ~150 |
| `hooks/useSidebarState.ts` | ~80 |
| `sidebar/EditorSidebar.tsx` | ~180 |

**Rischi**: prop-drilling massivo se stato locale non passa a hook o Context.

---

### 3.12 (Alt) `components/editor/ExportDialog.tsx` drivers

Sezione già coperta (§3.6). `bff.ts` già coperto (§3.4).

---

## 4. Chronon3d — Tools (6 file)

### 4.1 `tools/telemetry_dashboard/frontend/src/components/MetricsGrid.jsx` (1102 LOC) — 🔴 CRITICAL

**Estrazioni** (da verificare con lettura effettiva del file):

| Modulo | LOC |
|---|---|
| `components/metrics/CpuMetricsPanel.jsx` | ~150 |
| `components/metrics/GpuMetricsPanel.jsx` | ~180 |
| `components/metrics/MemoryMetricsPanel.jsx` | ~120 |
| `components/metrics/CacheMetricsPanel.jsx` | ~120 |
| `components/metrics/NetworkMetricsPanel.jsx` | ~120 |
| `components/MetricsGrid.jsx` (orchestrator) | ~250 |

---

### 4.2 `tools/telemetry_dashboard/frontend/src/App.jsx` (816 LOC) — 🟡 HIGH

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `App/router.jsx` | ~80 (tab → component map) |
| `App/useAppData.js` | ~150 (fetchRuns, fetchRunDetail, data orchestration) |
| `App/AppSocket.js` | ~120 (socket.io setup + handlers) |
| `App/AppClipboard.js` | ~30 (copyTextToClipboard) |
| `App.jsx` | ~250 |

---

### 4.3 `tools/telemetry_dashboard/telemetry_server/database.py` (846 LOC) — 🔴 CRITICAL

**Estrazioni**:

| Modulo | LOC | Contenuto |
|---|---|---|
| `telemetry_server/schema.py` | ~50 | `_load_schema_sql` |
| `telemetry_server/connections.py` | ~120 | SharedReadConnection, _LockedCursor |
| `telemetry_server/row_builders/run.py` | ~20 | |
| `telemetry_server/row_builders/frame.py` | ~30 | |
| `telemetry_server/row_builders/phase.py` | ~20 | |
| `telemetry_server/row_builders/counter.py` | ~20 | |
| `telemetry_server/row_builders/node.py` | ~30 | |
| `telemetry_server/row_builders/layer.py` | ~30 | |
| `telemetry_server/row_builders/cache.py` | ~20 | |
| `telemetry_server/row_builders/culling.py` | ~25 | |
| `telemetry_server/row_builders/text.py` | ~25 | |
| `telemetry_server/row_builders/image.py` | ~25 | |
| `telemetry_server/row_builders/tile.py` | ~30 | |
| `telemetry_server/inserters.py` | ~30 | `_insert_batch` |
| `telemetry_server/hydrate.py` | ~120 | `_hydrate_video_metrics` |
| `telemetry_server/database.py` | ~80 | `create_merged_connection` + import facade |

---

### 4.4 `tools/telemetry_dashboard/telemetry_server/flask_app.py` (749 LOC) — 🟡 HIGH

**Estrazioni** (Flask Blueprint refactor):

| Modulo | LOC |
|---|---|
| `telemetry_server/auth.py` | ~30 (`require_auth`) |
| `telemetry_server/paths.py` | ~80 (`resolve_artifact_path`, `_find_cli`) |
| `telemetry_server/routes/runs.py` | ~120 (`get_runs`, `get_run_detail`) |
| `telemetry_server/routes/artifacts.py` | ~80 (`get_artifact`, `serve_output`) |
| `telemetry_server/routes/gallery.py` | ~110 (`output_gallery`, `video_gallery`) |
| `telemetry_server/routes/static.py` | ~30 (`serve_static`) |
| `telemetry_server/routes/manual_touches.py` | ~120 |
| `telemetry_server/routes/graph.py` | ~50 |
| `telemetry_server/sockets.py` | ~80 (`handle_connect`, `watch_database`) |
| `telemetry_server/flask_app.py` | ~80 (bootstrap + register blueprints) |

---

### 4.5 `tools/visual_quality_suite.py` (969 LOC) — 🟡 HIGH

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `tools/vqs/cli.py` | ~80 |
| `tools/vqs/pixel_tests.py` | ~40 |
| `tools/vqs/perceptual_tests.py` | ~50 |
| `tools/vqs/layout_tests.py` | ~70 |
| `tools/vqs/composition_tests.py` | ~50 |
| `tools/vqs/color_tests.py` | ~35 |
| `tools/vqs/gradient_tests.py` | ~30 |
| `tools/vqs/edge_tests.py` | ~30 |
| `tools/vqs/glow_tests.py` | ~50 |
| `tools/vqs/ocr.py` | ~120 |
| `tools/vqs/camera.py` | ~250 |
| `tools/vqs/smoke.py` | ~150 |
| `tools/vqs/determinism.py` | ~70 |

**Rischi**: pseudo-stato globale e directory temporanee condivise tra funzioni attuali → incapsulare in `vqs/context.py`.

---

### 4.6 `tools/perf/compare_telemetry.py` (738 LOC) — 🟢 MEDIUM

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `tools/perf/telemetry_db.py` | ~80 |
| `tools/perf/json_loader.py` | ~120 |
| `tools/perf/metrics_extractor.py` | ~150 |
| `tools/perf/formatters.py` | ~50 |
| `tools/perf/compare.py` | ~200 |
| `tools/perf/compare_telemetry.py` (CLI) | ~120 |

---

### 4.7 `tools/perf/pr_gate.py` (568 LOC) — 🟢 MEDIUM

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `tools/perf/pr_gate/shell_runner.py` | ~30 |
| `tools/perf/pr_gate/image_hash.py` | ~40 |
| `tools/perf/pr_gate/gate_result.py` | ~40 |
| `tools/perf/pr_gate/gates/determinism.py` | ~50 |
| `tools/perf/pr_gate/gates/dirty_rect.py` | ~50 |
| `tools/perf/pr_gate/gates/golden_frames.py` | ~120 |
| `tools/perf/pr_gate/gates/performance.py` | ~150 |
| `tools/perf/pr_gate.py` (CLI) | ~120 |

---

### 4.8 `tools/lib_perf_regression.py` (462 LOC) — 🟢 LOW

**Estrazioni**:

| Modulo | LOC |
|---|---|
| `tools/perf_regression/parsers.py` | ~60 |
| `tools/perf_regression/stats.py` | ~80 |
| `tools/perf_regression/compare.py` | ~180 |
| `tools/perf_regression/verdict.py` | ~70 |
| `tools/lib_perf_regression.py` (CLI) | ~80 |

---

## 5. Cross-file Dependency Graph (sintesi)

```
                  ┌─────────────────────────┐
                  │ stores/editorStore.ts   │
                  └──────────┬──────────────┘
                             │ CanvasObject type
       ┌─────────┬───────────┼───────────┬──────────┐
       ▼         ▼           ▼           ▼          ▼
templateStore  projectStore versioningStore presetStore ...
       │         │           │
       ▼         ▼           ▼
   data/default  hooks      (history,
   Templates    (sharing)    undo/redo)


api.ts + api/bff.ts ──▶ api/core/*  (nuovo)
                            ▲
              ┌──────┬──────┼──────┬──────┐
              │      │      │      │      │
        mediaClient  project   preset  folder  drive  bff/*

Canvas.tsx ──▶ canvas/CanvasRenderers.tsx (suddiviso in shapes/)
       │                          │
       └──▶ hooks/useCanvas{X}    └──▶ canvas/{Text,Image,Crop}*
            (nuovi)


telemetry_server/database.py ──▶ row_builders/* (nuovo) + connections.py
telemetry_server/flask_app.py ──▶ routes/* (blueprint) + sockets.py
```

---

## 6. Rischi Globali

| # | Rischio | Impatto | Mitigazione |
|---|---|---|---|
| R1 | Import circolari fra `editorStore.ts` slices | Alto | Inizializzazione lazy + `set/get` typed |
| R2 | `__tests__/editorStoreHelpers.test.ts` accede `getObjectsArrayFromState` | Alto | Mantenere export identico in `objectSlice.ts` + re-export |
| R3 | Duplicato `VeloxEditiingg/VeloxFrontend/web/dark_editor/` | Alto | Sync post-refactor via rsync/diff o cherry-pick manuale per ogni commit |
| R4 | socket.io handlers in flask_app | Medio | Estrarre a `sockets.py` mantenendo ordine init |
| R5 | database.py row_builders + `_hydrate_video_metrics` | Medio | Non rompere transazioni: usare cursor passato per param |
| R6 | Persist middleware in `templateStore.ts` | Basso | Ridurre subset lentamente e test migrations |
| R7 | Performance Konva renderers | Medio | Mantieni `React.memo` e ref stabilization |

---

## 7. Execution Order (fasi)

### Fase 1 — Leaf li, basso rischio (~12 commit)
1. `lib_perf_regression.py` → 5 moduli
2. `compare_telemetry.py` → 6 moduli
3. `pr_gate.py` → 8 moduli
4. `visual_quality_suite.py` → 13 moduli

### Fase 2 — Lib/helpers no-touch (~25 commit)
5. `api.ts` → 8 moduli (incluso barrel)
6. `api/bff.ts` → 8 moduli (incluso barrel)
7. `advancedEffects.ts` → 6 moduli (incluso barrel)
8. `templateStore.ts` → 3 moduli

### Fase 3 — Component leaf (~30 commit)
9. `MetricsGrid.jsx` → 6 moduli
10. `App.jsx` → 5 moduli
11. `CanvasRenderers.tsx` → 6 moduli
12. `AdvancedTemplatePanel.tsx` → 4 moduli
13. `CollaborationPanel.tsx` → 5 moduli
14. `ExportDialog.tsx` → 6 moduli
15. `EditorSidebar.tsx` → 3 moduli

### Fase 4 — Core (~30 commit)
16. `database.py` → ~16 moduli
17. `flask_app.py` → ~10 moduli
18. `Canvas.tsx` → 4 hook + core
19. `editorStore.ts` → 3 slices (PIÙ CRITICA — 44+ call site)

---

## 8. Definition of Done (per file)

- [ ] Tutti i moduli estratti esistono e sono importabili dal codebase.
- [ ] Tutti gli import del file originale aggiornati.
- [ ] `npm run build` (VeloxFrontend) o `python -m py_compile` (Chronon3d) verde.
- [ ] Test suite (`npm test`, `pytest`) verde.
- [ ] Conformità lint (`eslint`, `ruff`/`flake8`) verde.
- [ ] File originale ≤ LOC target indicato.
- [ ] Back-compat re-export rimosso (dopo 1 settimana se tutto verde).
- [ ] **1 commit + push su `main` dopo ogni estrazione.**

---

## 9. Regole di Commit (vincolanti)

| | Regola |
|---|---|
| ❌ | NO branch di feature |
| ❌ | NO squash di più estrazioni in un commit |
| ❌ | NO commit che tocchino file di altri refactor |
| ✅ | 1 commit per estrazione atomica |
| ✅ | Push su `main` dopo **ogni** commit |
| ✅ | `git add` *only* dei file del commit corrente |
| ✅ | Messaggio: `refactor(<area>): extract <module> from <file>` |
| ✅ | Body del commit: `Moved N functions (X LOC) to <new-path>. Back-compat re-export maintained.` |
| ✅ | Esempio: `chore(<area>): update call site for new <module>` |

### Script di commit helper (proposta)

```bash
# Comandi dopo ogni estrazione, eseguito nella root del progetto giusto
git add <file-originale> <nuovi-moduli>
git commit -m "refactor(<area>): extract <module> from <file>"
git push origin main
```

---

## 10. Sync `VeloxEditiingg` (post-refactor)

Dato che `VeloxEditiingg/VeloxFrontend/web/dark_editor/` è un duplicato di `VeloxFrontend/web/dark_editor/`:

- Dopo ogni commit refactor su `VeloxFrontend/main`, applicare lo stesso cambiamento al duplicato.
- ⚠️ Possibile uso di `git format-patch` + `git am` o `diff -ruN | patch`.
- ⚠️ Testare che `VeloxEditiingg` build + test restino verdi.

---

## 11. Metriche di Avanzamento

Tracking via questo file: ad ogni commit refactor spuntare la casella corrispondente.

### VeloxFrontend

- [ ] **3.1** `editorStore.ts` → historySlice · objectSlice · effectsSlice
- [ ] **3.2** `templateStore.ts` → defaultTemplates · templateEngine
- [ ] **3.3** `api.ts` → 7 client modules + barrel
- [ ] **3.4** `api/bff.ts` → 6+ modules + barrel
- [ ] **3.5** `advancedEffects.ts` → 5 modules + barrel (vedi §2.2)
- [ ] **3.6** `ExportDialog.tsx` → 5 sotto-moduli
- [ ] **3.7** `AdvancedTemplatePanel.tsx` → 3 sub-components
- [ ] **3.8** `CollaborationPanel.tsx` → 4 sub-components
- [ ] **3.9** `Canvas.tsx` → 3 hooks + core
- [ ] **3.10** `CanvasRenderers.tsx` → 5 sub-renderers
- [ ] **3.11** `EditorSidebar.tsx` → 2 sub-components + hook

### Chronon3d

- [ ] **4.1** `MetricsGrid.jsx` → 5 panels
- [ ] **4.2** `App.jsx` → 4 modules
- [ ] **4.3** `database.py` → ~15 modules
- [ ] **4.4** `flask_app.py` → 9 modules
- [ ] **4.5** `visual_quality_suite.py` → 12 modules
- [ ] **4.6** `compare_telemetry.py` → 5 modules
- [ ] **4.7** `pr_gate.py` → 7 modules
- [ ] **4.8** `lib_perf_regression.py` → 4 modules

---

## 12. Note Finali

- Ogni singolo commit deve essere **verde**: build, lint, test.
- Push frequenti = history pulita, rollback atomico per singolo step.
- Se un commit rompe qualcosa: revert + fix in commit separato (NON riscrivere la history).
- Coordinamento: usare il **branch protection** su `main` con check CI obbligatori.

**Done = tutti i file ≤ 250 LOC + 0 file > 500 LOC + lint verde + test verdi.**
