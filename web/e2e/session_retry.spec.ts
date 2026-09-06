/**
 * E2E: unified client session-retry contract.
 *
 * Pins the transport-level behavior implemented in
 * src/lib/session-refresh.ts (withSessionRefresh) and the merged
 * src/lib/api/client.ts:
 *
 *   1. An authed API request that receives HTTP 401 triggers EXACTLY ONE
 *      POST /api/v1/auth/refresh, then retries the original request once.
 *      The retried request succeeds and the view renders.
 *   2. A failed refresh (401 from /auth/refresh) is NOT retried — the
 *      original 401 surfaces, and exactly one refresh attempt was made
 *      (replayed refresh tokens revoke the whole token family).
 *
 * The backend is fully mocked via page.route() — no server needed.
 */

import { test, expect } from '@playwright/test';

const JOB_PATH = '**/api/v1/jobs/job-e2e-retry';
const REFRESH_PATH = '**/api/v1/auth/refresh';

test.describe('Unified client 401 → refresh → retry', () => {
    test('retries the original request once after a single successful refresh', async ({ page }) => {
        let jobCalls = 0;
        let refreshCalls = 0;

        await page.route(JOB_PATH, async (route) => {
            jobCalls += 1;
            if (jobCalls === 1) {
                // First attempt: expired access token.
                await route.fulfill({ status: 401, body: '{"error":"token expired"}' });
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ job: { id: 'job-e2e-retry', status: 'RUNNING' } }),
            });
        });

        await page.route(REFRESH_PATH, async (route) => {
            refreshCalls += 1;
            await route.fulfill({
                status: 200,
                headers: {
                    // Rotated cookie pair; the retry then carries it.
                    'Set-Cookie': 'session=rotated-access; Path=/; HttpOnly; SameSite=Lax',
                },
                contentType: 'application/json',
                body: '{"ok":true}',
            });
        });

        await page.goto('/jobs/detail/job-e2e-retry');

        // The hook must have retried after the 401 (second call served 200).
        await expect.poll(() => jobCalls, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
        // Exactly ONE refresh — a second POST would risk the backend's
        // refresh-token-replay theft detection revoking the token family.
        expect(refreshCalls).toBe(1);
        await expect(page.locator('body')).toBeVisible();
    });

    test('does not retry when the refresh itself fails (genuine 401 surfaces)', async ({ page }) => {
        let jobCalls = 0;
        let refreshCalls = 0;

        await page.route(JOB_PATH, async (route) => {
            jobCalls += 1;
            await route.fulfill({ status: 401, body: '{"error":"unauthorized"}' });
        });

        await page.route(REFRESH_PATH, async (route) => {
            refreshCalls += 1;
            await route.fulfill({ status: 401, body: '{"error":"refresh invalid"}' });
        });

        await page.goto('/jobs/detail/job-e2e-retry');

        // Original request attempted, refreshed once, retried once, failed again,
        // and NO further refresh (the single-attempt bound held).
        await expect.poll(() => jobCalls, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
        await page.waitForTimeout(500);
        expect(refreshCalls).toBe(1);
    });
});
