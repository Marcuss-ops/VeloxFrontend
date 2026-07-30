# Changelog

## [Unreleased] - 2026-07-29

### Routing localhost (Caddy)
- `InstaeditLogin/ops/local/Caddyfile` rimosso il matcher `handle /_next*` (ridondante: il `basePath: '/dark_editor_v2'` del Dark Editor Next.js già cattura i suoi asset sotto `/dark_editor_v2/_next/*`).
- Routing finale: `/api/*` → `:8081` (BFF Go), `/dark_editor_v2/*` → `:3001` (Dark Editor Next.js), fallback → `:5173` (SPA Vite InstaEdit Social).
- Conseguenza architetturale: `http://localhost/` è sempre la SPA InstaEdit Social. Il Dark Editor è raggiungibile SOLO sotto `/dark_editor_v2/...`.

### Gate sessione YouTube nel Dark Editor
- Nuovo hook `web/dark_editor/hooks/useYouTubeSessionGate.ts`: prima di montare il Canvas chiama `GET /api/v1/youtube/editor-sessions/by-project/{velox_project_id}` e mappa la risposta a uno stato discriminato (`not_found`, `unauthorized`, `readonly_publishing`, `readonly_published`, `editable_editing`, `editable_failed`).
- `web/dark_editor/hooks/useProjectLoader.ts` consuma lo stato del gate; nessuna fetch del progetto se il gate rifiuta; flag `readonly:true` propagato al Canvas quando lo stato è `readonly_*`.
- `web/dark_editor/app/editor/[projectId]/page.tsx`:
  - `401 unauthorized` → redirect immediato a `InstaEdit Social /login`.
  - `404 not_found` → `SessionGateError` visibile ~3s (con projectId + bottone "Vai alla Dashboard") poi auto-redirect a `/dashboard-channels`.
  - `status=publishing` → banner statico full-page `SessionBlocked`, nessun Canvas mutabile montato.
  - `status=published` → banner statico `SessionReadonly` + CTA "Vedi su YouTube", nessun Canvas mutabile montato.
- Regola: l'unico path legittimo per raggiungere il Dark Editor è `InstaEdit Social → selezione video privato/unlisted → POST /api/v1/youtube/editor-sessions → editor_url canonico`. L'accesso diretto a `/dark_editor_v2/editor/<id>` è ammesso solo se il gate autorizza.

### E2E via InstaEdit Social
- Nuovo `web/e2e/groups_to_editor_flow.spec.ts`: test del flow canonico InstaEdit Social (Vite `:3000`) → `/groups/{groupId}/videos` → click "Crea sessione" → verifica `POST /api/v1/youtube/editor-sessions` 201 con `editor_url` canonico `/dark_editor_v2/editor/{velox_project_id}` → `window.open` popup → gate 200 → progetto caricato → Canvas montato. Step 0 architetturale garantisce che la root sia la SPA, NON il Dark Editor.
- `web/e2e/session_gate.spec.ts` rafforzato (5 test totali):
  - Test 1 (fake ID → 404): ora verifica `waitForRequest` sul gate per `/api/v1/youtube/editor-sessions/by-project/<FAKE_PROJECT_ID>`, `canvas count == 0`, e `waitForURL(/\/dashboard-channels/)` per l'auto-redirect di Azione 4.
  - Test 5 (NEW, 401 → `/login`): mock `by-project` → 401, mock difensivo `/auth/me` → 401 per evitare identità inconsistenti col gate, verifica gate request + Canvas NOT mounted + redirect immediato a `/login`.

### Commits coinvolti (HEAD → base)
- `eefae42 test(e2e): Azione 7 invalid URL blocked by YouTube session gate`
- `0c821ef test(e2e): Azione 6 real flow InstaEdit Social → Dark Editor`
- `0849128 feat(dark-editor): Azione 4 redirect + UI per stato sessione`
- `9e2900e feat(dark-editor): wire useYouTubeSessionGate into useProjectLoader`
- `922486b feat(dark-editor): spec'd discriminated union for YouTube session gate`
- `c0658a5 feat(session-gate): aggiungi gate sessione YouTube nel Dark Editor`

## [Unreleased] - 2026-07-11

### Submodule relationship
- `VeloxEditiingg/.gitmodules` pins `VeloxFrontend` to commit `a2113ae` (intentional, by user request).
- Standalone `VeloxFrontend` HEAD is at `2369671` (newer than the submodule pin).
- The pin in the parent is preserved as-is: anyone who clones `VeloxEditiingg` gets `VeloxFrontend` at `a2113ae`, NOT at its latest standalone HEAD.
- This is by design for the migration backup: the parent project snapshot reflects the state at the backup time, not a rolling HEAD.

