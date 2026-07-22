# `web/e2e/`

End-to-end Playwright specs for VeloxFrontend. The cross-repo smoke
harness exercises the wired pipeline VeloxFrontend → InstaeditLogin
BFF → VeloxEditiingg DataServer, asserting both the Velox job
wire-contract and the security deny-list (Velox must remain
platform-agnostic: no `channel_id`, `access_token`,
`platform_media_id`, etc. ever leak into a Velox job payload).

## Spec execution

The Playwright config (`web/playwright.config.ts`) declares a
**dual `webServer`** array: one entry boots the Vite SPA on `:3000`
via `npm run dev` from `web/`, the other boots the Next.js dark
editor on `:3001` via `npm run dev` from `web/dark_editor/` — which
expands to `next dev -p 3001`. Both directories MUST have a healthy
`node_modules` before any spec can run; from `web/`, run `npm ci`,
then `cd web/dark_editor && npm ci` (or run them in parallel).
Playwright waits up to 180 s for each port to bind; if either entry
fails to come up, no test executes — the suite blocks at the
readiness probe.

If `cd web/dark_editor && npm install` is skipped (or the install
fails midway), the dark editor's `node_modules` is empty or
incomplete and `next dev -p 3001` aborts immediately with a
`Cannot find module <pkg>` error (typically `'next'`, but the
exact message depends on which dependency dropped out of
`node_modules`) before binding port `:3001`. Playwright's webServer
readiness probe then hits its 180 s timeout and **every** test in
the suite reports `Error: webServer exited before timeout` — even
though the spec files themselves are syntactically and
semantically sound. The fix is to re-run `npm ci` inside
`web/dark_editor/` (no other change is needed); the same specs
will then pass without any edits.

> If you use `pnpm` or `yarn`, replace `npm ci` with
> `pnpm install --frozen-lockfile` or `yarn install --frozen-lockfile`
> respectively. Each subtree ships its own lockfile.

## Modes

- **Fast mocks (default; `MOCK !== "false"`)** — specs run against
  in-test `page.route` mocks. Used on every-PR CI; ~5–10 s per
  spec. Trigger:
  `npm run test:e2e:cleanup` (chains `web/e2e/scripts/cleanup-ports.sh`
  before *and* after the spec run; releases `:3000` and `:3001`
  from leftover `next dev` / `vite` / `esbuild` children of
  interrupted runs).
- **Live mode (opt-in; `MOCK === "false"`)** — the same specs run
  against `web/docker-compose-e2e.yml` (Postgres + InstaeditLogin
  BFF + VeloxEditiingg DataServer, brought up via
  `web/scripts/run-e2e-live.sh`). Trigger: `npm run test:e2e:live`.

## Specs in this directory

- `cross_repo_smoke.spec.ts` — dark editor queues a Velox
  render+publish job, Vite SPA loads `/velox/jobs/{id}`, the
  delivery row's `social_delivery_id` is visible. Pins the
  **security deny-list** on the POST `/api/v1/velox/jobs` body:
  the mock `listSocialDestinations` response carries
  `platform_account_id=999` and the spec asserts that id (along
  with `channel_id`, `access_token`, etc.) does NOT leak into the
  Velox payload.
- `cross_repo_smoke_polling.spec.ts` — sibling smoke that locks
  down `useVeloxJobDetail`'s 5-second `setInterval` poll re-hit.
  Uses a TIME-WINDOWED response shaper so the populated
  transition is pinned to a real 5-second wait regardless of
  React 18 StrictMode double-mounting or layout-driven refetches.
- `scripts/cleanup-ports.sh` — invoked by `npm run test:e2e:cleanup`
  before and after the spec run.

Both specs depend on the dual `webServer` block declared in
`web/playwright.config.ts`. The `webServer` array is the single
source of truth for which dev servers must come up before any
spec can run.

## Notable gotcha

- **EADDRINUSE on `:3001` after interrupted runs.** A leftover
  `next dev` child process from a prior interrupted Playwright run
  may still hold the port. `npm run test:e2e:cleanup` already
  handles this; if you start Playwright directly via
  `npx playwright test`, run `web/e2e/scripts/cleanup-ports.sh`
  manually first.
