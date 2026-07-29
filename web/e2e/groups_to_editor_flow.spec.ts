/**
 * Real-flow E2E test — InstaEdit Social → Dark Editor via /groups/{id}/videos.
 *
 * Validates the only legitimate path an operator can use to reach the
 * Dark Editor:
 *
 *   1. InstaEdit Social homepage (Vite SPA on :3000) is the entry point.
 *   2. Operator navigates to /groups/:groupId/videos.
 *   3. SPA renders a private/unlisted video card whose button reads
 *      "Crea sessione" (because editor_url is null while editor_status
 *      is 'ready').
 *   4. Click → createYouTubeEditorSession → POST /api/v1/youtube/editor-sessions
 *      returns 201 with editor_url "/dark_editor_v2/editor/{velox_project_id}".
 *   5. onSuccess opens editor_url in a new tab (window.open with
 *      _blank + noopener + noreferrer).
 *   6. The popup lands on the Dark Editor (Next.js on :3001).
 *      The gate (Azione 1-4) calls GET /editor-sessions/by-project/{id},
 *      resolves to status='editing' → editable_editing → Canvas mounts
 *      with the project row loaded.
 *
 * What this test does NOT cover (kept isolated for debuggability):
 *   - Direct-URL access to /dark_editor_v2/editor/{fake} blocked by the
 *     gate → covered by session_gate.spec.ts.
 *   - Publish pipeline from Dark Editor to Velox job → covered by
 *     cross_repo_smoke.spec.ts and cross_repo_smoke_polling.spec.ts.
 *
 * Mocks:
 *   context.route (shared across the Vite SPA page AND the popup):
 *     - GET /api/v1/auth/me (used by both halves)
 *     - GET /api/v1/youtube/editor-sessions/by-project/{id} (Dark Editor gate)
 *     - GET /dark_editor_v2/api/projects/{id} (editor's useProjectLoader)
 *     - dark_editor's sibling endpoints (drive/process/presets/folders)
 *       to satisfy mount-time fetches
 *   page.route (Vite SPA only):
 *     - GET /api/v1/groups/{id}/youtube/videos (the listing)
 *     - POST /api/v1/youtube/editor-sessions (the mint endpoint)
 *
 * Dev servers on :3000 (Vite) and :3001 (Dark Editor) are started by
 * playwright.config.ts via `npm run dev`.
 */

import { test, expect } from '@playwright/test';

const VITE_SPA_BASE = 'http://localhost:3000';
const DARK_EDITOR_BASE = 'http://localhost:3001';
const GROUP_ID = '123';
const VIDEO_ID = 'yt-real-flow-1';
const WORKSPACE_ID = 42;
const PLATFORM_ACCOUNT_ID = 999;
const EXPECTED_VELOX_PROJECT_ID = 've_real_flow_1';
const EXPECTED_SESSION_ID = 'session-real-flow-1';
const PROJECT_NAME = 'Real Flow Project';

interface CapturedMint {
    body: unknown;
    responseStatus: number;
}

test.beforeEach(async ({ context }) => {
    // CSRF double-submit cookie — domain='localhost' so it travels
    // across :3000 (Vite SPA) and :3001 (Dark Editor) navigations.
    await context.addCookies([
        {
            name: 'csrf_token',
            value: 'mock-csrf-token-real-flow',
            domain: 'localhost',
            path: '/',
        },
    ]);
});

test('real flow: InstaEdit Social /groups/{id}/videos → Crea sessione → Dark Editor mounts', async ({ page, context }) => {
    const capturedMint: CapturedMint = { body: null, responseStatus: 0 };

    // ----------------------------------------------------------------
    // Mocks shared by the Vite SPA AND the popup (context.route)
    // ----------------------------------------------------------------

    // GET /api/v1/auth/me — used by Vite's AuthProvider AND by the
    // dark editor's bff.ts. Both SPA halves share this contract.
    await context.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            json: { user: { id: 123, name: 'Real Flow Tester', workspace_id: WORKSPACE_ID } },
        });
    });

    // GET /api/v1/youtube/editor-sessions/by-project/{id} — the
    // Dark Editor's gate endpoint. status='editing' → the loader
    // resolves to editable_editing and the Canvas mounts.
    await context.route('**/api/v1/youtube/editor-sessions/by-project/**', async (route) => {
        await route.fulfill({
            json: {
                id: EXPECTED_SESSION_ID,
                workspace_id: WORKSPACE_ID,
                platform_account_id: PLATFORM_ACCOUNT_ID,
                youtube_video_id: VIDEO_ID,
                velox_project_id: EXPECTED_VELOX_PROJECT_ID,
                desired_privacy: 'private',
                status: 'editing',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            },
        });
    });

    // GET /dark_editor_v2/api/projects/{id} — the editor's own
    // useProjectLoader endpoint. Returns the project row that
    // populates the "Senza nome" input.
    await context.route('**/dark_editor_v2/api/projects/*', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                json: {
                    id: EXPECTED_VELOX_PROJECT_ID,
                    name: PROJECT_NAME,
                    type: 'image',
                    canvas_json: { objects: [] },
                    preview_url: '',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
            });
            return;
        }
        await route.fallback();
    });

    // Sibling endpoints that the editor fetches at mount time. Empty
    // bodies are safe — see existing session_gate.spec.ts + cross_repo_smoke
    // for the rationale (any auto-fire at mount would otherwise hit the
    // real Next dev server).
    await context.route('**/dark_editor_v2/api/drive/**', async (route) => {
        await route.fulfill({ json: {} });
    });
    await context.route('**/dark_editor_v2/api/process/**', async (route) => {
        await route.fulfill({ json: {} });
    });
    await context.route('**/dark_editor_v2/api/presets/**', async (route) => {
        await route.fulfill({ json: [] });
    });
    await context.route('**/dark_editor_v2/api/folders/**', async (route) => {
        await route.fulfill({ json: { folders: [] } });
    });

    // ----------------------------------------------------------------
    // Mocks scoped to the Vite SPA only (page.route)
    // ----------------------------------------------------------------

    // GET /api/v1/groups/{id}/youtube/videos — list endpoint that
    // feeds the /groups/{id}/videos page. Returns ONE private video
    // in 'ready' state so the card shows "Crea sessione" (no
    // editor_url means the SPA must mint one before opening).
    await page.route('**/api/v1/groups/**/youtube/videos**', async (route) => {
        await route.fulfill({
            json: {
                videos: [
                    {
                        youtube_video_id: VIDEO_ID,
                        title: PROJECT_NAME,
                        thumbnail_url: 'https://i.ytimg.com/vi/yt-real-flow-1/maxresdefault.jpg',
                        privacy_status: 'private',
                        processing_status: 'processed',
                        platform_account_id: PLATFORM_ACCOUNT_ID,
                        channel_name: 'Real Flow Channel',
                        editor_status: 'ready',
                    },
                ],
                warnings: [],
            },
        });
    });

    // POST /api/v1/youtube/editor-sessions — the mint endpoint.
    // Captures the request body for assertion; returns 201 with the
    // canonical editor_url pointing at the Dark Editor's basePath
    // route on :3001.
    await page.route('**/api/v1/youtube/editor-sessions', async (route) => {
        if (route.request().method() === 'POST') {
            let parsed: unknown = null;
            try {
                parsed = route.request().postDataJSON();
            } catch {
                // Body isn't valid JSON — assertion below will fail loudly.
            }
            capturedMint.body = parsed;
            capturedMint.responseStatus = 201;
            await route.fulfill({
                status: 201,
                json: {
                    session_id: EXPECTED_SESSION_ID,
                    velox_project_id: EXPECTED_VELOX_PROJECT_ID,
                    editor_url: `${DARK_EDITOR_BASE}/dark_editor_v2/editor/${EXPECTED_VELOX_PROJECT_ID}`,
                },
            });
            return;
        }
        await route.fallback();
    });

    // ----------------------------------------------------------------
    // Step 0 — Land on InstaEdit Social homepage (NOT the Dark Editor)
    // ----------------------------------------------------------------
    // Architectural guard: the SPA root must be InstaEdit Social,
    // not the Dark Editor. The Caddy proxy in production forwards
    // `/dark_editor_v2/*` to Next.js, so a direct navigation to
    // http://localhost/ would land on InstaEdit Social — the test
    // must enforce that contract.
    await page.goto(VITE_SPA_BASE);
    await expect(page).not.toHaveURL(/\/dark_editor_v2\//);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('input[placeholder="Senza nome"]')).toHaveCount(0);

    // ----------------------------------------------------------------
    // Step 1 — Navigate from InstaEdit Social into the group page
    // ----------------------------------------------------------------
    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);

    // ----------------------------------------------------------------
    // Step 2 — Wait for the video card to render
    // ----------------------------------------------------------------
    // GroupVideoCard sets aria-label="Apri Dark Editor per {title}"
    // REGARDLESS of the visible button text ("Crea sessione" vs
    // "Apri Dark Editor"). Matching by aria-label keeps the test
    // decoupled from the text variant and the editor_url state.
    const cardButton = page.getByRole('button', {
        name: `Apri Dark Editor per ${PROJECT_NAME}`,
    });
    await expect(cardButton).toBeVisible({ timeout: 10_000 });

    // ----------------------------------------------------------------
    // Step 3 — Click "Crea sessione" + capture the popup atomically
    // ----------------------------------------------------------------
    // The Promise.all idiom registers waitForEvent('popup') BEFORE
    // the click is dispatched. Otherwise there's a race where
    // window.open fires before the listener is wired up and the
    // popup opens unobserved.
    const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        cardButton.click(),
    ]);

    // ----------------------------------------------------------------
    // Step 4 — Verify the POST mint + canonical editor_url
    // ----------------------------------------------------------------
    // After the popup opens, the route handler has already populated
    // capturedMint — the response is consumed BEFORE window.open fires
    // (window.open lives inside onSuccess of the mutation).
    await popup.waitForLoadState('domcontentloaded');
    expect(capturedMint.responseStatus).toBe(201);
    expect(capturedMint.body).toEqual({
        workspace_id: WORKSPACE_ID,
        platform_account_id: PLATFORM_ACCOUNT_ID,
        youtube_video_id: VIDEO_ID,
    });

    const popupUrl = popup.url();
    expect(popupUrl).toBe(
        `${DARK_EDITOR_BASE}/dark_editor_v2/editor/${EXPECTED_VELOX_PROJECT_ID}`,
    );

    // ----------------------------------------------------------------
    // Step 5 — Verify the Dark Editor mounted correctly
    // ----------------------------------------------------------------
    // The gate resolved to editable_editing, useProjectLoader fetched
    // the project row, and useProjectStore.setCurrentProject populated
    // the "Senza nome" input. Canvas mounted means the editor is
    // fully functional — operator can now mutate the thumbnail.
    await popup.locator('input[placeholder="Senza nome"]').waitFor({ timeout: 30_000 });
    await expect(popup.locator('input[placeholder="Senza nome"]')).toHaveValue(PROJECT_NAME);
    await expect(popup.locator('canvas')).not.toHaveCount(0);
});
