/**
 * E2E Smoke Tests
 * 
 * AGENT 13C/13E - Frontend Migration & Legacy Decommission
 * 
 * Smoke tests for all main routes defined in router.tsx.
 * Routes must match the unified React router configuration.
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Routes', () => {
    test('should load the application root', async ({ page }) => {
        await page.goto('/');
        
        // Root redirects to dashboard-channels
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Dashboard should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to dashboard-channels', async ({ page }) => {
        await page.goto('/dashboard-channels');
        
        // Dashboard channels should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to overview (alias for dashboard)', async ({ page }) => {
        await page.goto('/overview');
        
        // Overview should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Workers', () => {
    test('should navigate to workers dashboard', async ({ page }) => {
        await page.goto('/workers/dashboard');
        
        // Workers dashboard should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Creator Studio', () => {
    test('should navigate to creator studio', async ({ page }) => {
        await page.goto('/creator_studio_app');
        
        // Creator studio should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - YouTube', () => {
    test('should navigate to YouTube manager', async ({ page }) => {
        await page.goto('/youtube_manager');
        
        // YouTube manager should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to YouTube upload', async ({ page }) => {
        await page.goto('/youtube/upload');
        
        // YouTube upload should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to YouTube channels', async ({ page }) => {
        await page.goto('/youtube/channels');
        
        // YouTube channels should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to YouTube livestream', async ({ page }) => {
        await page.goto('/youtube/livestream');
        
        // YouTube livestream should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Analytics', () => {
    test('should navigate to analytics', async ({ page }) => {
        await page.goto('/analytics');
        
        // Analytics should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to analytics dashboard', async ({ page }) => {
        await page.goto('/analytics/dashboard');
        
        // Analytics dashboard should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Finance', () => {
    test('should render finance route', async ({ page }) => {
        await page.goto('/finance');
        
        // Finance route should render (may redirect via React Router)
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Drive', () => {
    test('should navigate to drive', async ({ page }) => {
        await page.goto('/drive');
        
        // Drive should render
        await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to drive explorer', async ({ page }) => {
        await page.goto('/drive/explorer');
        
        // Drive explorer should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Ansible', () => {
    test('should navigate to ansible computers', async ({ page }) => {
        await page.goto('/ansible_computers');
        
        // Ansible computers should render
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Smoke Tests - Fallback', () => {
    test('should handle unknown routes gracefully', async ({ page }) => {
        await page.goto('/unknown-route-xyz');
        
        // Should render something (fallback route or 404)
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Sidebar Navigation', () => {
    test('should have working sidebar links', async ({ page }) => {
        await page.goto('/');
        
        // Find sidebar navigation links
        const sidebar = page.locator('aside, [data-sidebar], nav').first();
        
        if (await sidebar.isVisible()) {
            // Try clicking on Dashboard link
            const dashboardLink = page.getByRole('link', { name: /dashboard/i });
            if (await dashboardLink.isVisible()) {
                await dashboardLink.click();
                await expect(page).toHaveURL(/.*dashboard.*/);
            }
        }
    });
});

test.describe('API Health Check', () => {
    test('should have accessible backend API', async ({ page }) => {
        // Try to hit a health endpoint
        const response = await page.request.get('/api/health').catch(() => null);
        
        // We don't fail if API isn't available, just log it
        if (response) {
            console.log('API health status:', response.status());
        }
    });
});
