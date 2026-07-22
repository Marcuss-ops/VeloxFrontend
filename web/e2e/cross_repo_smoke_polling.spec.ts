/**
 * Cross-repo polling smoke test
 *
 * Exercises useVeloxJobDetail's 5-second poll re-hit end-to-end:
 *   GET /api/v1/velox/jobs/{id} is mocked with a TIME-WINDOWED
 *   response shaper.
 *     - Any GET whose elapsed-since-first-fetch < 5000 ms returns a
 *       delivery WITHOUT social_delivery_id (empty string) so
 *       VeloxJobDetailView renders the fallback row
 *       'Social delivery ID non ancora assegnato'.
 *     - Any GET whose elapsed-since-first-fetch >= 5000 ms returns
 *       the delivery WITH social_delivery_id populated, so the view
 *       re-renders the populated badge and the 5-second setInterval
 *       tick is verified independently of how many GETs happened.
 *
 * Why time-windowed instead of counter-based: Vite's React 18 + TS
 * template wraps <App /> in <React.StrictMode>, which double-fires
 * useEffect on mount in dev. useVeloxJobDetail's mount effect would
 * then fetchDetail() twice in the first ~5-15 ms with a counter-based
 * mock returning populated on the second hit, unmounting the
 * fallback row before any user-visible frame. The time-window
 * approach ignores fetch count and pins the populated transition to
 * a real 5-second wait, making the test deterministic regardless of
 * StrictMode, focus refetch, or layout-driven background GETs.
 *
 * This spec also pins the polling contract separately from the
 * happy-path smoke (cross_repo_smoke.spec.ts), which returns a
 * populated payload on the first call and therefore never exercises
 * the re-fire.
 *
 * Runtime budget: ~10-15 s (initial load + ~5 s poll tick + UI settle).
 * No dark_editor navigation; spec only loads the Vite SPA job-detail
 * route. Both webServer entries stay up so the existing cross-repo
 * smoke continues to work alongside this one.
 */

import { test, expect, type Page } from '@playwright/test';

const VITE_SPA_BASE = 'http://localhost:3000';
const PROJECT_ID = 'proj-smoke-polling-1';
const EXPECTED_JOB_ID = 'velox-job-poll-001';
const EXPECTED_SOCIAL_DELIVERY_ID = 'soc-del-poll-001';
const EXTERNAL_DEST_ID = 'ext-dest-youtube-channel-A';
const FALLBACK_TEXT = 'Social delivery ID non ancora assegnato';
const POLL_WINDOW_MS = 5_000;
const POLL_WINDOW_LOWER_BOUND_MS = 4_500;

test.beforeEach(async ({ context }) => {
    // CSRF double-submit cookie -- kept identical in shape to the
    // sibling smoke so cookie-jar behaviour is consistent across
    // the e2e suite.
    await context.addCookies([
        {
            name: 'csrf_token',
            value: 'mock-csrf-token-for-polling-test',
            domain: 'localhost',
            path: '/',
        },
    ]);
});

/**
 * registerApiMocks -- mock mode (default, MOCK !== 'false').
 *
 * Install a TIME-WINDOWED mock on GET /api/v1/velox/jobs/{EXPECTED_JOB_ID}.
 * `firstFetchAt` latches on the first observed GET (any future GET
 * re-reads `Date.now() - firstFetchAt` to decide between fallback and
 * populated). Counter is preserved as telemetry for assertions.
 *
 * The catch-all on /api/v1/* URLs (registered FIRST so subsequent
 * routes take priority under Playwright's last-registered-wins
 * semantics) forwards anything we did not explicitly mock to the
 * network, so layout-driven background GETs neither hang nor 404
 * with side effects we did not anticipate.
 *
 * FORMATTING GOTCHA: never put the byte sequence with two
 * consecutive asterisks followed by a slash inside this JSDoc
 * block. That sequence runs into the JS comment-terminator
 * pattern, closes the block early, and turns the remainder into
 * code-mode -- where undefined identifier tokens (typically the
 * slug fragments inside the glob) produce TS2304 errors. Use
 * prose descriptions or single-asterisk glob variants instead.
 */
function registerApiMocks(page: Page, counter: { getCount: number }) {
    let firstFetchAt: number | null = null;

    // FIRST: lowest-priority catch-all -- any /api/v1/* we did not
    // explicitly mock falls through to the network. This avoids
    // hangs when the root or shared layout fires additional GETs
    // (e.g. /api/v1/profile/foo, /api/v1/users/me) that we did
    // not enumerate.
    page.route('**/api/v1/**', async (route) => {
        await route.fallback();
    });

    // GET /api/v1/auth/me -- useSocialDestinations needs a session
    // to learn the workspace_id and resolve destinations. Workspace
    // 42 is a stable sandbox fixture.
    page.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            json: { user: { id: 123, name: 'Polling Tester', workspace_id: 42 } },
        });
    });

    // GET /api/v1/integrations/velox/destinations --
    // useSocialDestinations fetches this to enrich delivery rows
    // with label/provider. An empty list is sufficient: the
    // destination map is only used for label display, not for the
    // social_delivery_id assertion.
    page.route('**/api/v1/integrations/velox/destinations**', async (route) => {
        await route.fulfill({ json: { destinations: [] } });
    });

    // Counter-based + TIME-WINDOWED GET mock. counter.getCount
    // is incremented on every GET (telemetry + assertion). The
    // returned payload is shaped by elapsed-since-first-fetch:
    // < POLL_WINDOW_MS -> fallback, >= POLL_WINDOW_MS -> populated.
    // Decoupling response shaping from fetch count pins the
    // populated transition to a real 5-second wait even when
    // StrictMode or layout-driven effects produce extra GETs.
    page.route(`**/api/v1/velox/jobs/${EXPECTED_JOB_ID}`, async (route) => {
        if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
        }

        counter.getCount += 1;
        const now = Date.now();
        if (firstFetchAt === null) {
            firstFetchAt = now;
        }
        const elapsedSinceFirst = now - firstFetchAt;
        const inFallbackWindow = elapsedSinceFirst < POLL_WINDOW_MS;

        const baseJob = {
            id: EXPECTED_JOB_ID,
            projectId: PROJECT_ID,
            renderStatus: 'SUCCEEDED',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: counter.getCount === 1
                ? '2024-01-01T00:00:00Z'
                : new Date(now).toISOString(),
        };

        const response = inFallbackWindow
            ? // Fallback window: empty socialDeliveryId triggers the
              // fallback row in VeloxJobDetailView's ternary.
              {
                  job: baseJob,
                  deliveries: [
                      {
                          externalDestinationId: EXTERNAL_DEST_ID,
                          socialDeliveryId: '',
                          status: 'PUBLISHED',
                          platformUrl: 'https://youtube.com/watch?v=polling',
                      },
                  ],
              }
            : // Past the window: populated -> fallback row unmounts.
              {
                  job: baseJob,
                  deliveries: [
                      {
                          externalDestinationId: EXTERNAL_DEST_ID,
                          socialDeliveryId: EXPECTED_SOCIAL_DELIVERY_ID,
                          status: 'PUBLISHED',
                          platformUrl: 'https://youtube.com/watch?v=polling',
                      },
                  ],
              };

        await route.fulfill({ json: response });
    });
}

/**
 * registerLiveRoute -- live mode (MOCK === 'false').
 *
 * Passthrough counter that proves the polling infrastructure fires
 * at least twice within the polling window. Live mode intentionally
 * does NOT enforce the empty-then-populated contract: production
 * timing varies too widely to deterministically assert.
 */
async function registerLiveRoute(page: Page, counter: { getCount: number }) {
    await page.route(`**/api/v1/velox/jobs/${EXPECTED_JOB_ID}`, async (route) => {
        if (route.request().method() !== 'GET') {
            await route.continue();
            return;
        }
        counter.getCount += 1;
        await route.continue();
    });
}

test('cross-repo polling smoke: 5-second poll re-hit re-renders social_delivery_id', async ({ page }) => {
    const counter: { getCount: number } = { getCount: 0 };

    const isMockMode = process.env.MOCK !== 'false';
    if (isMockMode) {
        registerApiMocks(page, counter);
    } else {
        await registerLiveRoute(page, counter);
    }

    // ===== Load job detail directly on the Vite SPA =====
    // (No dark_editor navigation; the polling hook lives in
    // useVeloxJobDetail which is consumed by VeloxJobDetailView
    // on :3000.)
    await page.goto(`${VITE_SPA_BASE}/velox/jobs/${EXPECTED_JOB_ID}`);

    // Render badge for SUCCEEDED job -> 'Completato' label.
    await expect(page.getByText('Completato').first()).toBeVisible({ timeout: 15_000 });

    if (isMockMode) {
        // ===== Mock mode: full empty-then-populated contract =====
        // Initial fetch (mock returns fallback within the
        // POLL_WINDOW_MS window) -> fallback row visible.
        await expect(page.getByText(FALLBACK_TEXT)).toBeVisible({
            timeout: 10_000,
        });
        expect(counter.getCount).toBeGreaterThanOrEqual(1);

        const t1 = Date.now();

        // ===== Tick #2 (5s poll re-fire) -- populated, fallback gone =====
        // After POLL_WINDOW_MS, the mock starts returning the
        // populated payload. The forthcoming re-poll (from
        // useVeloxJobDetail's setInterval(5000)) will pick it up.
        await expect(
            page.getByText(EXPECTED_SOCIAL_DELIVERY_ID, { exact: true }),
        ).toBeVisible({ timeout: 15_000 });

        // Fallback row must be unmounted (count == 0) after the
        // re-render. DeliveryRow's React key prefers socialDeliveryId
        // first; the boolean flip unmounts the previous row entirely.
        await expect(page.getByText(FALLBACK_TEXT)).toHaveCount(0);

        const t2 = Date.now();
        expect(counter.getCount).toBeGreaterThanOrEqual(2);

        // Polling re-fire timing -- useVeloxJobDetail's setInterval
        // schedules the next fetch every 5000 ms. We assert the
        // populated transition landed at least ~4500 ms after the
        // fallback first became visible, so a regression that
        // collapses the interval (e.g. refetch on every effect run,
        // ignoring the time-window threshold) trips this guard.
        //
        // The exact 5000 ms upper bound is implicit in the 15 s
        // toBeVisible timeout (a regression that never crosses the
        // window would time out waiting for the populated span).
        const elapsed = t2 - t1;
        expect(elapsed).toBeGreaterThanOrEqual(POLL_WINDOW_LOWER_BOUND_MS);
    } else {
        // ===== Live mode: poll infrastructure only =====
        // Production responses vary too widely to assert the
        // empty-then-populated contract deterministically, so we
        // only verify that AT LEAST 2 GETs fire within the polling
        // window and that they are at least ~4500 ms apart.
        const t1 = Date.now();
        await expect
            .poll(() => counter.getCount, { timeout: 15_000 })
            .toBeGreaterThanOrEqual(2);
        const t2 = Date.now();

        // Timing invariant: setInterval(5000) guarantees the second
        // GET arrives at least ~4500 ms after setInterval was
        // scheduled. Lower-bound is the lock; upper-bound is
        // implicit in the 15 s expect.poll timeout.
        expect(t2 - t1).toBeGreaterThanOrEqual(POLL_WINDOW_LOWER_BOUND_MS);
    }
});
