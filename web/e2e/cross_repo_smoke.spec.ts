/**
 * Cross-repo smoke test
 *
 * Validates the wired pipeline:
 *   InstaEdit Social (Vite SPA :3000)
 *     └→ /groups/{id}/videos → POST /api/v1/youtube/editor-sessions (mint)
 *     └→ Popup → Dark Editor (Next.js :3001)
 *     └→ ExportDialog → fill title → click Pubblica
 *     └→ BFF: presign → upload → complete → PATCH thumbnail → POST publish
 *     └→ Success toast + security contract check
 *
 * Entrypoint: la SPA InstaEdit Social (NO accesso diretto al Dark Editor).
 * Il flow reale è:
 *   1. SPA root → /groups/{id}/videos
 *   2. Click "Crea sessione" → POST /editor-sessions → 201 + editor_url
 *   3. window.open popup → Dark Editor
 *   4. ExportDialog → fill title → click Pubblica
 *   5. Toast "Pubblicato su YouTube"
 *   6. Security contract: no OAuth / channel_id / platform_account_id leakage
 *
 * Both backends are mocked locally via page.route(); the test runs against
 * the real DarkEditor and Vite SPA shells with NO live InstaeditLogin or
 * VeloxEditiingg running. The point of the smoke is the WIRING and the
 * SECURITY CONTRACT, not the live backends themselves.
 */

import { test, expect, type BrowserContext } from '@playwright/test';
import {
    VITE_SPA_BASE,
    setupBaseContext,
    setupProjectMock,
    setupSpaVideosListMock,
    setupSpaMintMock,
    setupGateMock,
    clickCreaSessioneAndCapturePopup,
} from './helpers/sharedMocks';

const GROUP_ID = '123';
const VIDEO_TITLE = 'Cross Repo Smoke Video';
const SESSION = {
    sessionId: 'session-cross-repo-smoke',
    veloxProjectId: 've_cross_repo_smoke_session',
};

test.beforeEach(async ({ context }) => {
    await setupBaseContext(context, { csrfToken: 'mock-csrf-token-for-smoke-test' });
});

type CapturedPublishPost = {
    body: unknown;
    url: string;
} | null;

/**
 * Register the publish-flow mocks for the new ExportDialog (YouTube
 * metadata publish). Mocks the entire BFF chain:
 *   1. POST /api/v1/media/presign           -> presigned upload URL
 *   2. PUT  <upload_url>                    -> mock S3 upload
 *   3. PATCH .../by-project/{id}            -> attach thumbnail to session
 *   4. POST  .../by-project/{id}/publish    -> YouTube publish
 *
 * `capturedPublish.post` is mutated on the POST publish call so the
 * security-contract deny-list assertion can inspect the body.
 */
function registerPublishMocks(context: BrowserContext, capturedPublish: { post: CapturedPublishPost }) {
    // 1. Media presign
    context.route('**/api/v1/media/presign', async (route) => {
        await route.fulfill({
            json: {
                upload_url: 'http://127.0.0.1:9999/mock-upload',
                asset_id: 'mock-asset-123',
            },
        });
    });

    // 2. Mock S3/GCS PUT
    context.route('**/mock-upload', async (route) => {
        await route.fulfill({ status: 200 });
    });

    // 3. Media complete
    context.route('**/api/v1/media/*/complete', async (route) => {
        await route.fulfill({ json: { id: 'mock-media-123' } });
    });

    // 4+5. YouTube editor session: PATCH (thumbnail) + POST (publish)
    context.route('**/api/v1/youtube/editor-sessions/by-project/**', async (route) => {
        const req = route.request();

        // Thumbnail attachment (PATCH)
        if (req.method() === 'PATCH') {
            await route.fulfill({ status: 200, json: {} });
            return;
        }

        // Publish (POST .../publish)
        if (req.method() === 'POST' && req.url().endsWith('/publish')) {
            let parsed: unknown;
            try {
                parsed = req.postDataJSON();
            } catch {
                /* body capture best-effort */
            }
            capturedPublish.post = { body: parsed, url: req.url() };

            await route.fulfill({
                json: {
                    status: 'published',
                    video_id: 'mock-yt-id',
                    public_url: 'https://youtube.com/watch?v=mock',
                    privacy_status: 'private',
                    actual_privacy: 'private',
                    youtube_sync_status: 'confirmed',
                },
            });
            return;
        }

        await route.fallback();
    });
}

test('cross-repo smoke: SPA → mint → dark editor publish → security contract', async ({
    page,
    context,
    request,
}) => {
    const capturedPublish: { post: CapturedPublishPost } = { post: null };

    // SPA flow mocks (page.route)
    await setupSpaVideosListMock(page, {
        groupId: GROUP_ID,
        videoId: 'yt-cross-repo-smoke',
        title: VIDEO_TITLE,
    });
    await setupSpaMintMock(page, SESSION);

    // Gate + project mocks (context.route, shared with popup)
    await setupGateMock(context, {
        veloxProjectId: SESSION.veloxProjectId,
        verdict: { kind: '200', status: 'editing' },
    });
    await setupProjectMock(context, SESSION.veloxProjectId, {
        projectName: 'Smoke Test Project',
    });

    // Publish flow mocks (context.route, shared with popup)
    registerPublishMocks(context, capturedPublish);

    // Mode gate:
    //   MOCK !== 'false' (default) -> fast mocks via page.route
    //   MOCK === 'false'           -> live services
    const isMockMode = process.env.MOCK !== 'false';
    if (!isMockMode) {
        // Live mode fast-fail: confirm InstaeditLogin BFF is reachable.
        const probe = await request.get(
            'http://127.0.0.1:8080/api/v1/auth/me',
            { failOnStatusCode: false },
        );
        const probeStatus = probe.status();
        if (probeStatus !== 200 && probeStatus !== 401) {
            throw new Error(
                `live-mode pre-flight: InstaeditLogin BFF on 127.0.0.1:8080 returned ${probeStatus}; expected 200|401.`,
            );
        }

        // Live mode: capture the publish POST body for security check.
        await context.route(
            '**/api/v1/youtube/editor-sessions/by-project/*/publish',
            async (route) => {
                if (route.request().method() === 'POST') {
                    try {
                        capturedPublish.post = {
                            body: route.request().postDataJSON(),
                            url: route.request().url(),
                        };
                    } catch {
                        /* body capture best-effort */
                    }
                }
                await route.continue();
            },
        );
    }

    // Override canvas.toBlob so Konva exports synchronously.
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

    // ===== Step 1: SPA flow → mint → popup =====
    await page.goto(VITE_SPA_BASE);
    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);
    const popup = await clickCreaSessioneAndCapturePopup(page, VIDEO_TITLE);
    await popup.waitForLoadState('domcontentloaded');

    // ===== Step 2: Wait for dark editor to mount =====
    await expect(popup.locator('input[placeholder="Senza nome"]')).toHaveValue(
        'Smoke Test Project',
        { timeout: 60_000 },
    );

    // ===== Step 3: Click Export button → dialog opens =====
    await popup.locator('button[title="Export"]').click();
    const dialog = popup.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // ===== Step 4: Fill in the title (required by validation) =====
    const testTitle = 'Cross Repo Smoke Publish';
    await dialog.getByRole('textbox').first().fill(testTitle);

    // ===== Step 5: Click Pubblica (wait for it to be enabled) =====
    const publishBtn = dialog.getByRole('button', { name: /Pubblica/i });
    await expect(publishBtn).toBeEnabled({ timeout: 10_000 });
    await publishBtn.click();

    // ===== Step 6: Verify success toast (or diagnostic on error) =====
    // Wait for either the success toast or an error toast, whichever appears first.
    try {
        await expect(popup.getByText(/Pubblicato su YouTube/i)).toBeVisible({
            timeout: 15_000,
        });
    } catch {
        // If the success toast didn't appear, check if an error toast did.
        const errorToast = popup.getByText(/Pubblicazione fallita/i);
        const isErrorVisible = await errorToast.isVisible().catch(() => false);
        if (isErrorVisible) {
            const errorText = await errorToast.textContent();
            throw new Error(`Publish failed with error: ${errorText}`);
        }
        throw new Error('No toast appeared after clicking Pubblica — publish may have silently failed');
    }

    // ===== Step 7: SECURITY CONTRACT =====
    expect(capturedPublish.post, 'POST /publish was not captured').not.toBeNull();
    const body = capturedPublish.post!.body as { title?: string };

    expect(body.title).toBe(testTitle);

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
            `forbidden field '${field}' leaked into publish payload`,
        ).not.toContain(field);
    }
});
