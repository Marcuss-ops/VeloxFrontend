/**
 * Cross-repo smoke test
 *
 * Validates the wired pipeline:
 *   VeloxFrontend (Next.js dark editor on :3001)
 *     └→ BFF GET /api/v1/integrations/velox/destinations  (now backed by InstaeditLogin list)
 *     └→ BFF POST /api/v1/projects + POST /api/v1/velox/jobs
 *     └→ Vite SPA /velox/jobs/{id} → VeloxJobDetailView renders social_delivery_id
 *
 * Both backends are mocked locally via page.route(); the test runs against
 * the real DarkEditor and Vite SPA shells with NO live InstaeditLogin or
 * VeloxEditiingg running. The point of the smoke is the WIRING and the
 * SECURITY CONTRACT (no OAuth / channel_id / platform_account_id leakage
 * into the Velox job payload), not the live backends themselves.
 */

import { test, expect, type Page } from '@playwright/test';

const DARK_EDITOR_BASE = 'http://localhost:3001';
const VITE_SPA_BASE = 'http://localhost:3000';
const PROJECT_ID = 'proj-smoke-cross-repo-1';
const EXTERNAL_DEST_ID = 'ext-dest-youtube-channel-A';
const EXPECTED_JOB_ID = 'velox-job-888';
const EXPECTED_PROJECT_ID = 'velox-proj-777';
const EXPECTED_SOCIAL_DELIVERY_ID = 'soc-del-999';

test.beforeEach(async ({ context }) => {
    // CSRF double-submit cookie (read from document.cookie in dark_editor's bff.ts
    // and Vite's client.ts on every mutation). domain='localhost' makes the
    // cookie apply to BOTH :3000 and :3001 — the cookie jar travels with the
    // browser context across navigations between ports.
    await context.addCookies([
        {
            name: 'csrf_token',
            value: 'mock-csrf-token-for-smoke-test',
            domain: 'localhost',
            path: '/',
        },
    ]);
});

type CapturedJobPost = {
    body: unknown;
    url: string;
} | null;

function registerApiMocks(
    page: Page,
    capturedJobs: { post: CapturedJobPost },
) {
    // ----- Catch-alls for dark_editor's own Go backend endpoints that are
    //       NOT part of the cross-repo pipeline but are mounted via siblings
    //       of useSocialDestinations: useDriveIntegration fetches groups,
    //       FormatQualitySection mounts preset fetchers, FolderAdmin fetches
    //       folders, etc. Without these the dialog hangs on unmocked GETs.
    page.route('**/dark_editor_v2/api/drive/**', async (route) => {
        if (route.request().method() === 'GET') {
            // getDriveGroups / listDriveFolders / getDriveFiles / getDriveLinks
            // all return empty shapes; the dialog is fine with empty drives.
            const url = route.request().url();
            if (url.includes('/groups')) {
                await route.fulfill({ json: { groups: [] } });
            } else if (url.includes('/folders')) {
                await route.fulfill({ json: { folders: [] } });
            } else if (url.includes('/files')) {
                await route.fulfill({ json: { files: [] } });
            } else if (url.includes('/links')) {
                await route.fulfill({ json: { links: [] } });
            } else {
                await route.fulfill({ json: {} });
            }
            return;
        }
        await route.fallback();
    });

    page.route('**/dark_editor_v2/api/presets/**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: [] });
            return;
        }
        await route.fallback();
    });

    page.route('**/dark_editor_v2/api/folders/**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: { folders: [] } });
            return;
        }
        await route.fallback();
    });

    // ----- DARK_EDITOR's project load (matches what useProjectLoader calls) -----
    page.route('**/dark_editor_v2/api/projects/*', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                json: {
                    id: PROJECT_ID,
                    name: 'Smoke Test Project',
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

    // ----- BFF mocks (Vite :3000 + dark_editor :3001) -----

    // GET /api/v1/auth/me — useSocialDestinations calls this to learn workspace_id.
    page.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            json: { user: { id: 123, name: 'Smoke Tester', workspace_id: 42 } },
        });
    });

    // GET /api/v1/integrations/velox/destinations — InstaeditLogin list endpoint.
    // The response includes platform_account_id=999 INTERNALLY; the security
    // contract below proves platform_account_id does NOT leak into the POST
    // body sent to Velox. Velox must remain platform-agnostic.
    page.route('**/api/v1/integrations/velox/destinations**', async (route) => {
        await route.fulfill({
            json: {
                destinations: [
                    {
                        external_destination_id: EXTERNAL_DEST_ID,
                        label: 'Smoke Test Channel',
                        provider: 'youtube',
                        status: 'active',
                        platform_account_id: 999,
                        workspace_id: 42,
                        source_system: 'velox',
                    },
                ],
            },
        });
    });

    // POST /api/v1/projects — createVeloxProject from dark_editor/bff.ts.
    page.route('**/api/v1/projects', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                json: {
                    id: EXPECTED_PROJECT_ID,
                    name: 'Smoke Test Project',
                    workspace_id: 42,
                    status: 'CREATED',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
            });
            return;
        }
        await route.fallback();
    });

    // POST /api/v1/velox/jobs — createVeloxJob from dark_editor/bff.ts.
    // The route handler ONLY captures the body and returns a successful mock.
    // The full security-contract deny-list check is performed at the test
    // boundary (see Step 9 below) where the failure path is the cleanest.
    page.route('**/api/v1/velox/jobs/**', async (route) => {
        const req = route.request();

        if (req.method() === 'POST') {
            let parsed: unknown;
            try {
                parsed = req.postDataJSON();
            } catch (err) {
                await route.fulfill({ status: 400, json: { error: 'invalid json' } });
                return;
            }
            capturedJobs.post = { body: parsed, url: req.url() };

            // Inline shape check — keeps a fast feedback in the route handler
            // without throwing (route handlers should never throw; they should
            // fulfill or fallback). The deny-list check happens test-side so
            // the failure message is in the assertion, not an uncaught.
            const dlPlan = (
                parsed as
                    | { delivery_plan?: { destinations?: Array<Record<string, unknown>> } }
                    | null
            )?.delivery_plan;
            const firstDest = dlPlan?.destinations?.[0];
            if (
                !firstDest ||
                typeof firstDest.external_destination_id !== 'string'
            ) {
                await route.fulfill({
                    status: 400,
                    json: {
                        error:
                            'delivery_plan.destinations[0].external_destination_id missing or wrong type',
                    },
                });
                return;
            }

            await route.fulfill({
                json: {
                    id: EXPECTED_JOB_ID,
                    projectId: EXPECTED_PROJECT_ID,
                    renderStatus: 'SUCCEEDED',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
            });
            return;
        }

        if (req.method() === 'GET') {
            // VeloxJobDetailView (via Vite SPA) polls this every 5s while render
            // is non-terminal. We return immediately-rendered SUCCEEDED plus a
            // populated social_delivery_id so step 12 passes on the first poll
            // (avoids artificial sleeps; the polling code itself is covered
            // by a sibling test).
            await route.fulfill({
                json: {
                    job: {
                        id: EXPECTED_JOB_ID,
                        projectId: EXPECTED_PROJECT_ID,
                        renderStatus: 'SUCCEEDED',
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z',
                    },
                    deliveries: [
                        {
                            externalDestinationId: EXTERNAL_DEST_ID,
                            socialDeliveryId: EXPECTED_SOCIAL_DELIVERY_ID,
                            status: 'PUBLISHED',
                            platformUrl: 'https://youtube.com/watch?v=smoke-cross-repo',
                        },
                    ],
                },
            });
            return;
        }

        await route.fallback();
    });
}

test('cross-repo smoke: dark editor \u2192 InstaEdit destinations \u2192 Velox job \u2192 social_delivery_id', async ({ page }) => {
    const capturedJobs: { post: CapturedJobPost } = { post: null };

    // Mode gate:
    //   MOCK !== 'false' (default) -> fast mocks via page.route (CI / every PR)
    //   MOCK === 'false'           -> live services via docker-compose-e2e.yml
    // The security-contract deny-list assertion further down is mode-agnostic:
    // it inspects the captured POST /api/v1/velox/jobs body regardless of
    // whether the body came from a page.route.fulfill mock or a live
    // InstaeditLogin response.
    const isMockMode = process.env.MOCK !== 'false';
    if (isMockMode) {
        registerApiMocks(page, capturedJobs);
    } else {
        // Live mode fast-fail: confirm InstaeditLogin BFF on :8080 is
        // reachable before going further. A 401 (no auth) here is healthy.
        const probe = await request.get(
            'http://127.0.0.1:8080/api/v1/auth/me',
            { failOnStatusCode: false },
        );
        const probeStatus = probe.status();
        if (probeStatus !== 200 && probeStatus !== 401) {
            throw new Error(
                `live-mode pre-flight: InstaeditLogin BFF on 127.0.0.1:8080 returned ${probeStatus}; expected 200|401. Run \`bash web/scripts/run-e2e-live.sh\` to start live services.`,
            );
        }

        // Live mode: register a passthrough route ONLY for POST
        // /api/v1/velox/jobs so the deny-list assertion in step 6 still
        // fires. All other endpoints hit the live InstaeditLogin + Velox
        // backend through Vite's proxy /api/v1 -> 127.0.0.1:8080.
        await page.route('**/api/v1/velox/jobs/**', async (route) => {
            if (route.request().method() === 'POST') {
                try {
                    capturedJobs.post = {
                        body: route.request().postDataJSON(),
                        url: route.request().url(),
                    };
                } catch {
                    // Body isn't valid JSON; skip capture -- the
                    // deny-list assertion will fail loudly if the body
                    // is meant to be JSON.
                }
            }
            await route.continue();
        });
    }

    // Override HTMLCanvasElement.prototype.toBlob so the Konva canvas's toBlob
    // (invoked by exportCanvasToBlob via getCanvasElement \u2192 canvasEl.toBlob)
    // synchronously returns a fake PNG blob. Without this, the real Konva
    // canvas may not be in a state where toBlob yields valid bytes by the
    // time ExportDialog.handleExport fires.
    await page.addInitScript(() => {
        HTMLCanvasElement.prototype.toBlob = function (
            callback: BlobCallback | null,
            _type?: string,
            _quality?: number,
        ) {
            if (callback) {
                callback(new Blob(['smoke-cross-repo-blob'], { type: 'image/png' }));
            }
        };
    });

    // ===== Step 1: Load dark editor =====
    await page.goto(`${DARK_EDITOR_BASE}/editor/${PROJECT_ID}`);

    // Wait for project to load. The project-name input is populated by
    // useProjectLoader.setCurrentProject({ name }) \u2014 once "Smoke Test Project"
    // shows in the input, we know the canvas is mounted and dialogs can open.
    await expect(page.locator('input[placeholder="Senza nome"]')).toHaveValue(
        'Smoke Test Project',
        { timeout: 60_000 },
    );

    // ===== Step 2: Click Export button (ToolbarDock's last DockItem; title="Export") =====
    await page.locator('button[title="Export"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // ===== Step 3: Toggle "Queue to InstaEdit destination" =====
    await page.getByRole('checkbox', { name: 'Toggle InstaEdit destination' }).check();

    // ===== Step 4: Pick destination from the dropdown =====
    // SCOPED locator: FormatQualitySection's format select is `<select>` #1
    // in DOM order. The destination select is uniquely the select INSIDE
    // the bordered div that contains the InstaEdit toggle checkbox. This
    // disambiguates even if FormatQualitySection has its own select.
    const destinationSelect = page.locator(
        'div:has(input[aria-label="Toggle InstaEdit destination"]) select',
    );
    await destinationSelect.selectOption(EXTERNAL_DEST_ID);

    // ===== Step 5: Click submit ("Queue to InstaEdit") =====
    await page.getByRole('button', { name: 'Queue to InstaEdit' }).click();

    // Toast confirms the queue; this implicitly verifies the render chain
    // (createProject \u2192 createJob \u2192 returned jobId \u2192 toast).
    await expect(page.getByText(/Queued as Velox artifact/i)).toBeVisible({
        timeout: 15_000,
    });

    // ===== Step 6: SECURITY CONTRACT (the cross-repo key invariant) =====
    expect(capturedJobs.post, 'POST /api/v1/velox/jobs was not captured').not.toBeNull();
    const body = capturedJobs.post!.body as {
        project_id?: string;
        delivery_plan?: {
            destinations?: Array<{ external_destination_id?: string }>;
        };
    };

    // Shape assertion: project_id round-trips; destination carries the opaque
    // id (NOT platform_account_id from the listSocialDestinations response).
    expect(body.project_id).toBe(EXPECTED_PROJECT_ID);
    expect(body.delivery_plan?.destinations?.[0]?.external_destination_id).toBe(
        EXTERNAL_DEST_ID,
    );

    // Belt-and-suspenders deny-list. The mock listSocialDestinations response
    // carries platform_account_id=999 \u2014 if a regression re-introduces
    // platform-side identifiers into the Velox job payload, this trip.
    const forbidden = [
        'channel_id',
        'access_token',
        'refresh_token',
        'platform_account_id',
        'oauth',
        'client_secret',
        'youtube_account_id',
        'instagram_account_id',
        'tiktok_account_id',
        'linkedin_account_id',
    ];
    const bodyStr = JSON.stringify(body).toLowerCase();
    for (const field of forbidden) {
        expect(
            bodyStr,
            `forbidden field '${field}' leaked into Velox job payload \u2014 Velox must remain platform-agnostic`,
        ).not.toContain(field);
    }

    // ===== Step 7: Verify the VeloxJobDetailView renders social_delivery_id =====
    // The dark editor doesn't auto-navigate on queue success; we navigate
    // manually to the canonical job-detail route on the Vite SPA.
    await page.goto(`${VITE_SPA_BASE}/velox/jobs/${EXPECTED_JOB_ID}`);

    // The render badge "Completato" corresponds to renderStatus=SUCCEEDED in
    // VeloxJobDetailView.statusBadge.
    await expect(page.getByText('Completato').first()).toBeVisible({ timeout: 15_000 });

    // The cross-repo end: social_delivery_id is visible in the delivery row.
    await expect(page.getByText(EXPECTED_SOCIAL_DELIVERY_ID, { exact: true })).toBeVisible();
});
