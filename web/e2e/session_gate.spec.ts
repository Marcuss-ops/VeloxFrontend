/**
 * Session gate E2E test
 *
 * Verifica che il InstaEditor non permetta l'accesso diretto senza
 * una sessione YouTube valida. Il flusso corretto richiede:
 *   InstaEdit Social → selezione video → creazione sessione → editor_url reale
 *
 * Tutti i test partono dalla SPA Vite (:3000), cliccano "Crea sessione"
 * su una card video, e solo a quel punto il popup atterra sul InstaEditor.
 * Il comportamento del gate è determinato dal mock di
 * GET /api/v1/youtube/editor-sessions/by-project/{velox_project_id}
 * che ogni test configura con il verdict atteso.
 *
 * Test:
 *   1. Backend risponde 404 sul gate → SessionGateError + auto-redirect
 *      a /dashboard-channels (Azione 4 spec).
 *   2. Backend risponde session con status="publishing" → SessionBlocked,
 *      nessun Canvas mutabile.
 *   3. Backend risponde session con status="published" → SessionReadonly +
 *      CTA "Vedi su YouTube", nessun Canvas mutabile.
 *   4. Backend risponde session con status="editing" → Canvas monta,
 *      progetto caricato.
 *   5. Backend risponde 401 sul gate → redirect immediato a /login.
 *
 * Nessun entrypoint diretto a /instaeditor/editor/<hardcoded-id>:
 * ogni test mint una nuova session via POST /editor-sessions.
 */

import { test, expect } from '@playwright/test';
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
const VIDEO_TITLE = 'Gate Test Video';

const SESSION_404 = {
    sessionId: 'session-gate-404',
    veloxProjectId: 've_gate_404_session',
};
const SESSION_PUBLISHING = {
    sessionId: 'session-gate-publishing',
    veloxProjectId: 've_gate_publishing_session',
};
const SESSION_PUBLISHED = {
    sessionId: 'session-gate-published',
    veloxProjectId: 've_gate_published_session',
};
const SESSION_EDITING = {
    sessionId: 'session-gate-editing',
    veloxProjectId: 've_gate_editing_session',
};
const SESSION_401 = {
    sessionId: 'session-gate-401',
    veloxProjectId: 've_gate_401_session',
};

test.beforeEach(async ({ context }) => {
    await setupBaseContext(context, { csrfToken: 'mock-csrf-token-for-gate-test' });
});

test('session gate: backend returns 404 → SessionGateError + redirect to /dashboard-channels', async ({
    page,
    context,
}) => {
    await setupSpaVideosListMock(page, {
        groupId: GROUP_ID,
        videoId: 'yt-gate-404',
        title: VIDEO_TITLE,
    });
    await setupSpaMintMock(page, SESSION_404);
    await setupGateMock(context, {
        veloxProjectId: SESSION_404.veloxProjectId,
        verdict: { kind: '404' },
    });

    // SPA flow: home → /groups/{id}/videos → click "Crea sessione" → popup
    await page.goto(VITE_SPA_BASE);
    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);
    const popup = await clickCreaSessioneAndCapturePopup(page, VIDEO_TITLE);
    await popup.waitForLoadState('domcontentloaded');

    // Gate 404 → SessionGateError visibile con projectId + CTA Dashboard
    await expect(popup.getByText('Sessione non trovata')).toBeVisible({ timeout: 10_000 });
    await expect(popup.getByText(SESSION_404.veloxProjectId)).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Vai alla Dashboard' })).toBeVisible();

    // Canvas non viene mai montato quando il gate rifiuta
    await expect(popup.locator('canvas')).toHaveCount(0);

    // Azione 4: ~3s auto-redirect a /dashboard-channels (InstaEdit Social)
    await popup.waitForURL(/\/dashboard-channels/, { timeout: 5_000 });
});

test('session gate: backend returns publishing status → SessionBlocked, no Canvas', async ({
    page,
    context,
}) => {
    await setupSpaVideosListMock(page, {
        groupId: GROUP_ID,
        videoId: 'yt-gate-publishing',
        title: VIDEO_TITLE,
    });
    await setupSpaMintMock(page, SESSION_PUBLISHING);
    await setupProjectMock(context, SESSION_PUBLISHING.veloxProjectId, {
        projectName: 'Gate Publishing Project',
    });
    await setupGateMock(context, {
        veloxProjectId: SESSION_PUBLISHING.veloxProjectId,
        verdict: { kind: '200', status: 'publishing' },
    });

    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);
    const popup = await clickCreaSessioneAndCapturePopup(page, VIDEO_TITLE);
    await popup.waitForLoadState('domcontentloaded');

    // Banner statico full-page SessionBlocked
    await expect(popup.getByText('Pubblicazione in corso')).toBeVisible({ timeout: 10_000 });

    // Nessun Canvas mutabile montato
    await expect(popup.locator('canvas')).toHaveCount(0);
});

test('session gate: backend returns published status → SessionReadonly + CTA, no Canvas', async ({
    page,
    context,
}) => {
    await setupSpaVideosListMock(page, {
        groupId: GROUP_ID,
        videoId: 'yt-gate-published',
        title: VIDEO_TITLE,
    });
    await setupSpaMintMock(page, SESSION_PUBLISHED);
    await setupProjectMock(context, SESSION_PUBLISHED.veloxProjectId, {
        projectName: 'Gate Published Project',
    });
    await setupGateMock(context, {
        veloxProjectId: SESSION_PUBLISHED.veloxProjectId,
        verdict: { kind: '200', status: 'published' },
    });

    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);
    const popup = await clickCreaSessioneAndCapturePopup(page, VIDEO_TITLE);
    await popup.waitForLoadState('domcontentloaded');

    // Banner SessionReadly + CTA Vedi su YouTube
    await expect(popup.getByText('Video già pubblicato')).toBeVisible({ timeout: 10_000 });
    await expect(popup.getByText('Vedi su YouTube')).toBeVisible();

    // Nessun Canvas mutabile montato
    await expect(popup.locator('canvas')).toHaveCount(0);
});

test('session gate: backend returns editing status → Canvas mounts with project row', async ({
    page,
    context,
}) => {
    await setupSpaVideosListMock(page, {
        groupId: GROUP_ID,
        videoId: 'yt-gate-editing',
        title: VIDEO_TITLE,
    });
    await setupSpaMintMock(page, SESSION_EDITING);
    await setupProjectMock(context, SESSION_EDITING.veloxProjectId, {
        projectName: 'Gate Editing Project',
    });
    await setupGateMock(context, {
        veloxProjectId: SESSION_EDITING.veloxProjectId,
        verdict: { kind: '200', status: 'editing' },
    });

    // Konva canvas.toBlob override necessario per il mount dell'editor
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

    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);
    const popup = await clickCreaSessioneAndCapturePopup(page, VIDEO_TITLE);
    await popup.waitForLoadState('domcontentloaded');

    // Gate autorizza + useProjectLoader.fetch → setCurrentProject
    // → input "Senza nome" popolato con il nome del progetto mockato
    await expect(popup.locator('input[placeholder="Senza nome"]')).toHaveValue(
        'Gate Editing Project',
        { timeout: 60_000 },
    );

    // Canvas montato → editor completamente funzionante
    await expect(popup.locator('canvas')).not.toHaveCount(0);
});

test('session gate: gate endpoint returns 401 → popup redirects to /login', async ({
    page,
    context,
}) => {
    await setupSpaVideosListMock(page, {
        groupId: GROUP_ID,
        videoId: 'yt-gate-401',
        title: VIDEO_TITLE,
    });
    await setupSpaMintMock(page, SESSION_401);
    await setupGateMock(context, {
        veloxProjectId: SESSION_401.veloxProjectId,
        verdict: { kind: '401' },
    });

    await page.goto(`${VITE_SPA_BASE}/groups/${GROUP_ID}/videos`);
    const popup = await clickCreaSessioneAndCapturePopup(page, VIDEO_TITLE);
    await popup.waitForLoadState('domcontentloaded');

    // Canvas non viene mai montato quando il gate rifiuta (401)
    await expect(popup.locator('canvas')).toHaveCount(0);

    // Azione 4 spec: 401 → redirect immediato a /login (InstaEdit Social)
    await popup.waitForURL(/\/login/, { timeout: 5_000 });
});
