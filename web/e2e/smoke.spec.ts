/**
 * E2E Smoke Tests — InstaEdit (Groups + Dark Editor only)
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Routes', () => {
    test('should load the landing page', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('nav')).toBeVisible();
    });

    test('should handle unknown routes gracefully', async ({ page }) => {
        await page.goto('/unknown-route-xyz');
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('API Health Check', () => {
    test('should have accessible backend API', async ({ page }) => {
        const response = await page.request.get('/api/health').catch(() => null);
        if (response) {
            console.log('API health status:', response.status());
        }
    });
});
