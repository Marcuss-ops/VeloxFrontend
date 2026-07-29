/**
 * Session gate E2E test
 *
 * Verifica che il Dark Editor non permetta l'accesso diretto senza
 * una sessione YouTube valida. Il flusso corretto richiede:
 *   InstaEdit Social → selezione video → creazione sessione → editor_url reale
 *
 * Test:
 *   1. Accesso diretto con ID falso → gate blocca, mostra "Sessione non trovata"
 *   2. Accesso diretto con sessione valida → gate autorizza, canvas caricato
 *   3. Accesso con sessione nello stato "publishing" → gate blocca
 *   4. Accesso con sessione "published" → gate blocca
 */

import { test, expect, type Page } from '@playwright/test';

const DARK_EDITOR_BASE = 'http://localhost:3001';
const FAKE_PROJECT_ID = 've_fake_123';
const VALID_PROJECT_ID = 'proj-gate-valid-1';
const PUBLISHING_PROJECT_ID = 'proj-gate-publishing-1';
const PUBLISHED_PROJECT_ID = 'proj-gate-published-1';

test.beforeEach(async ({ context }) => {
    await context.addCookies([
        {
            name: 'csrf_token',
            value: 'mock-csrf-token-for-gate-test',
            domain: 'localhost',
            path: '/',
        },
    ]);
});

function registerSessionMock(page: Page) {
    // Mock della GET session by project per vari stati
    page.route('**/api/v1/youtube/editor-sessions/by-project/**', async (route) => {
        const url = route.request().url();

        if (url.includes(FAKE_PROJECT_ID)) {
            await route.fulfill({
                status: 404,
                json: { error: 'editor session not found' },
            });
            return;
        }

        if (url.includes(PUBLISHING_PROJECT_ID)) {
            await route.fulfill({
                json: {
                    id: 'session-publishing',
                    workspace_id: 42,
                    platform_account_id: 999,
                    youtube_video_id: 'yt-publishing-1',
                    velox_project_id: PUBLISHING_PROJECT_ID,
                    desired_privacy: 'private',
                    status: 'publishing',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
            });
            return;
        }

        if (url.includes(PUBLISHED_PROJECT_ID)) {
            await route.fulfill({
                json: {
                    id: 'session-published',
                    workspace_id: 42,
                    platform_account_id: 999,
                    youtube_video_id: 'yt-published-1',
                    velox_project_id: PUBLISHED_PROJECT_ID,
                    desired_privacy: 'public',
                    status: 'published',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
            });
            return;
        }

        // Default: valid editing session
        await route.fulfill({
            json: {
                id: 'session-valid',
                workspace_id: 42,
                platform_account_id: 999,
                youtube_video_id: 'yt-valid-1',
                velox_project_id: VALID_PROJECT_ID,
                desired_privacy: 'private',
                status: 'editing',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            },
        });
    });

    // Mock del progetto Velox per il caso valido
    page.route(`**/dark_editor_v2/api/projects/${VALID_PROJECT_ID}`, async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                json: {
                    id: VALID_PROJECT_ID,
                    name: 'Gate Test Project',
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

    // Catch-all per evitare che altre richieste blocchino il test
    page.route('**/dark_editor_v2/api/**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: {} });
            return;
        }
        await route.fulfill({ json: {} });
    });
}

test('session gate: direct access with fake project ID shows error and redirect option', async ({ page }) => {
    registerSessionMock(page);

    await page.goto(`${DARK_EDITOR_BASE}/editor/${FAKE_PROJECT_ID}`);

    // Deve mostrare il messaggio di sessione non trovata
    await expect(page.getByText('Sessione non trovata')).toBeVisible({ timeout: 10_000 });

    // Deve mostrare il project ID nel messaggio
    await expect(page.getByText(FAKE_PROJECT_ID)).toBeVisible();

    // Deve avere il pulsante per tornare alla dashboard
    await expect(page.getByRole('button', { name: 'Vai alla Dashboard' })).toBeVisible();
});

test('session gate: publishing session shows blocked state', async ({ page }) => {
    registerSessionMock(page);

    await page.goto(`${DARK_EDITOR_BASE}/editor/${PUBLISHING_PROJECT_ID}`);

    // Deve mostrare il messaggio di pubblicazione in corso
    await expect(page.getByText('Pubblicazione in corso')).toBeVisible({ timeout: 10_000 });

    // Il canvas NON deve essere montato
    await expect(page.locator('canvas')).toHaveCount(0);
});

test('session gate: published session shows readonly state', async ({ page }) => {
    registerSessionMock(page);

    await page.goto(`${DARK_EDITOR_BASE}/editor/${PUBLISHED_PROJECT_ID}`);

    // Deve mostrare il messaggio di video già pubblicato
    await expect(page.getByText('Video già pubblicato')).toBeVisible({ timeout: 10_000 });

    // Deve mostrare il link a YouTube
    await expect(page.getByText('Vedi su YouTube')).toBeVisible();

    // Il canvas NON deve essere montato
    await expect(page.locator('canvas')).toHaveCount(0);
});

test('session gate: valid editing session allows canvas to load', async ({ page }) => {
    registerSessionMock(page);

    // Override HTMLCanvasElement.prototype.toBlob per evitare errori Konva
    await page.addInitScript(() => {
        HTMLCanvasElement.prototype.toBlob = function (
            callback: BlobCallback | null,
            _type?: string,
            _quality?: number,
        ) {
            if (callback) {
                callback(new Blob(['mock-canvas'], { type: 'image/png' }));
            }
        };
    });

    await page.goto(`${DARK_EDITOR_BASE}/editor/${VALID_PROJECT_ID}`);

    // Il gate deve autorizzare e il progetto deve caricarsi.
    // Il nome del progetto appare nell'input in alto a sinistra.
    await expect(page.locator('input[placeholder="Senza nome"]')).toHaveValue(
        'Gate Test Project',
        { timeout: 60_000 },
    );

    // Il canvas deve essere montato
    await expect(page.locator('canvas')).not.toHaveCount(0);
});
