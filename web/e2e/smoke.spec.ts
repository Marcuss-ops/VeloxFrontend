/**
 * E2E Smoke Tests
 * 
 * Smoke tests for InstaEdit main routes.
 * Creator Studio has been permanently removed.
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Routes', () => {
    test('should load the application root', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to dashboard-channels', async ({ page }) => {
        await page.goto('/dashboard-channels');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to content (InstaEdit)', async ({ page }) => {
        await page.goto('/content');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to calendar', async ({ page }) => {
        await page.goto('/calendar');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to analytics', async ({ page }) => {
        await page.goto('/analytics');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to drive', async ({ page }) => {
        await page.goto('/drive');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to workers-ansible', async ({ page }) => {
        await page.goto('/workers-ansible');
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Groups', () => {
    test('should navigate to groups videos', async ({ page }) => {
        await page.goto('/groups/1/videos');
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Legacy /creator_studio_app redirect', () => {
    test('should redirect creator_studio_app to dashboard-channels', async ({ page }) => {
        await page.goto('/creator_studio_app');
        // Legacy route must redirect away from /creator_studio_app
        await expect(page).not.toHaveURL(/\/creator_studio_app/);
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Fallback', () => {
    test('should handle unknown routes gracefully', async ({ page }) => {
        await page.goto('/unknown-route-xyz');
        await expect(page.locator('body')).toBeVisible();
    });
});
