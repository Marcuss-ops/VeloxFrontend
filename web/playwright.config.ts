/**
 * Playwright Configuration
 *
 * Two webServer entries:
 *   - Vite SPA on http://localhost:3000  (VeloxJobDetailView lives here)
 *   - Next.js dark_editor on http://localhost:3001  (the editor lives here)
 *
 * The dual webServer is required so the cross-repo smoke spec can navigate
 * from /editor/{id} (dark editor on :3001) into /velox/jobs/{id} (Vite on :3000)
 * with both backends mocked via page.route().
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000/creator_studio_app/dist/',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'npm run dev',
            url: 'http://localhost:3000/creator_studio_app/dist/',
            reuseExistingServer: !process.env.CI,
            timeout: 180 * 1000,
        },
        {
            command: 'npm run dev',
            cwd: './dark_editor',
            url: 'http://localhost:3001/',
            reuseExistingServer: !process.env.CI,
            timeout: 180 * 1000,
        },
    ],
});
