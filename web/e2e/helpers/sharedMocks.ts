/**
 * Shared Playwright mock helpers for VeloxFrontend/web/e2e specs.
 *
 * Architectural rule: every e2e spec in this directory starts from
 * InstaEdit Social (Vite SPA on :3000), navigates to /groups/{id}/videos,
 * clicks "Crea sessione", and only after POST /api/v1/youtube/editor-sessions
 * returns 201 does the popup open at /instaeditor/editor/{velox_project_id}.
 *
 * This file is the single source of truth for:
 *   - CSRF cookie injection
 *   - GET /api/v1/auth/me
 *   - GET /api/v1/groups/{id}/youtube/videos (SPA list)
 *   - POST /api/v1/youtube/editor-sessions (SPA mint)
 *   - GET /api/v1/youtube/editor-sessions/by-project/{id} (InstaEditor gate)
 *   - GET /instaeditor/api/projects/{id} (loader)
 *   - InstaEditor mount-time sibling endpoints (drive/process/presets/folders)
 *
 * Direct navigation to /instaeditor/editor/<hardcoded-id> is reserved for
 * the gate-defense tests that explicitly need to test the gate's response to
 * arbitrary URLs (none in current specs; kept as a pattern only).
 */

import { type BrowserContext, type Page } from '@playwright/test';

export const VITE_SPA_BASE = 'http://localhost:3000';
export const DARK_EDITOR_BASE = 'http://localhost:3001';

export interface SessionMintedResponse {
    sessionId: string;
    veloxProjectId: string;
}

export type GateVerdict =
    | { kind: '200'; status: 'editing' | 'publishing' | 'published'; desiredPrivacy?: 'private' | 'public' | 'unlisted' }
    | { kind: '404' }
    | { kind: '401' };

/**
 * Inject the CSRF cookie + mock GET /api/v1/auth/me. The cookie domain
 * 'localhost' travels with the browser context across :3000 and :3001
 * navigations, so both the SPA and the popup share identity.
 */
export async function setupBaseContext(
    context: BrowserContext,
    options: {
        csrfToken?: string;
        workspaceId?: number;
        userName?: string;
        userId?: number;
    } = {},
): Promise<void> {
    await context.addCookies([
        {
            name: 'csrf_token',
            value: options.csrfToken ?? 'mock-csrf-token-shared',
            domain: 'localhost',
            path: '/',
        },
    ]);

    await context.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            json: {
                user: {
                    id: options.userId ?? 123,
                    name: options.userName ?? 'Shared Tester',
                    workspaceId: options.workspaceId ?? 42,
                    isAdmin: false,
                },
            },
        });
    });

    // Sibling endpoints mounted by InstaEditor at load time. Empty bodies
    // are safe: any auto-fire at mount would otherwise hit the real Next
    // dev server (502 / EAI_AGAIN).
    await context.route('**/instaeditor/api/drive/**', async (route) => {
        if (route.request().method() === 'GET') {
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
        if (
            route.request().method() === 'POST' &&
            route.request().url().includes('/upload')
        ) {
            await route.fulfill({ json: { success: false } });
            return;
        }
        await route.fallback();
    });

    await context.route('**/instaeditor/api/process/**', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: {} });
            return;
        }
        await route.fallback();
    });

    await context.route('**/instaeditor/api/presets/**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: [] });
            return;
        }
        await route.fallback();
    });

    await context.route('**/instaeditor/api/folders/**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: { folders: [] } });
            return;
        }
        await route.fallback();
    });
}

/**
 * Mock GET /instaeditor/api/projects/{id} — the loader endpoint.
 * Required for editing/publishing/published states (loader fetches).
 * NOT needed for 404/401 (loader short-circuits).
 */
export async function setupProjectMock(
    context: BrowserContext,
    projectId: string,
    options: { projectName?: string } = {},
): Promise<void> {
    await context.route(`**/api/projects/${projectId}`, async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                json: {
                    id: projectId,
                    name: options.projectName ?? 'Shared Mock Project',
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
}

/**
 * Mock GET /api/v1/groups/{id}/youtube/videos — the SPA's group page
 * list endpoint. Returns ONE video in 'ready' state with editor_url=null
 * so the card renders the "Crea sessione" CTA.
 */
export async function setupSpaVideosListMock(
    page: Page,
    options: {
        groupId: string;
        videoId: string;
        title?: string;
        privacy?: 'private' | 'unlisted' | 'public';
        platformAccountId?: number;
    },
): Promise<void> {
    await page.route('**/api/v1/groups/**/youtube/videos**', async (route) => {
        await route.fulfill({
            json: {
                videos: [
                    {
                        youtube_video_id: options.videoId,
                        title: options.title ?? 'Shared Mock Video',
                        thumbnail_url: `https://i.ytimg.com/vi/${options.videoId}/maxresdefault.jpg`,
                        privacy_status: options.privacy ?? 'private',
                        processing_status: 'processed',
                        platform_account_id: options.platformAccountId ?? 999,
                        channel_name: 'Shared Mock Channel',
                        editor_status: 'ready',
                    },
                ],
                warnings: [],
            },
        });
    });
}

/**
 * Mock POST /api/v1/youtube/editor-sessions — the SPA's mint endpoint.
 * Returns 201 with the canonical editor_url pointing at the InstaEditor's
 * basePath route on :3001.
 *
 * `captured` is mutated so callers can assert the request body the SPA
 * sent (workspace_id, platform_account_id, youtube_video_id).
 */
export async function setupSpaMintMock(
    page: Page,
    response: SessionMintedResponse,
    captured?: { body: unknown; responseStatus: number },
): Promise<void> {
    await page.route('**/api/v1/youtube/editor-sessions', async (route) => {
        if (route.request().method() === 'POST') {
            let parsed: unknown = null;
            try {
                parsed = route.request().postDataJSON();
            } catch {
                // Body isn't valid JSON — assertion below will fail loudly.
            }
            if (captured) {
                captured.body = parsed;
                captured.responseStatus = 201;
            }
            await route.fulfill({
                status: 201,
                json: {
                    session_id: response.sessionId,
                    velox_project_id: response.veloxProjectId,
                    editor_url: `${DARK_EDITOR_BASE}/instaeditor/editor/${response.veloxProjectId}`,
                },
            });
            return;
        }
        await route.fallback();
    });
}

/**
 * Mock GET /api/v1/youtube/editor-sessions/by-project/{id} — the
 * InstaEditor's gate endpoint. The verdict controls the gate state:
 *   - '404' → state='not_found', SessionGateError visible
 *   - '401' → state='unauthorized', redirect to /login
 *   - '200' with status='editing'    → state='editable_editing', Canvas mounts
 *   - '200' with status='publishing' → state='readonly_publishing', SessionBlocked
 *   - '200' with status='published'  → state='readonly_published', SessionReadonly
 *
 * For '200' verdicts you typically also want setupProjectMock() registered
 * so useProjectLoader has a project row to fetch.
 */
export async function setupGateMock(
    context: BrowserContext,
    options: { veloxProjectId: string; verdict: GateVerdict },
): Promise<void> {
    await context.route('**/api/v1/youtube/editor-sessions/by-project/**', async (route) => {
        const v = options.verdict;
        if (v.kind === '404') {
            await route.fulfill({
                status: 404,
                json: { error: 'editor session not found' },
            });
            return;
        }
        if (v.kind === '401') {
            await route.fulfill({
                status: 401,
                json: { error: 'missing user identity' },
            });
            return;
        }
        await route.fulfill({
            json: {
                id: `${options.veloxProjectId}-session`,
                workspaceId: 42,
                platform_account_id: 999,
                youtube_video_id: 'yt-shared-1',
                velox_project_id: options.veloxProjectId,
                desired_privacy: v.desiredPrivacy ?? 'private',
                status: v.status,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            },
        });
    });
}

/**
 * Helper: click the "Apri InstaEditor per {title}" button on a group
 * video card and return the popup page. Uses the Promise.all idiom to
 * register waitForEvent('popup') BEFORE the click is dispatched.
 */
export async function clickCreaSessioneAndCapturePopup(
    page: Page,
    title: string,
): Promise<Page> {
    const cardButton = page.getByRole('button', {
        name: `Apri InstaEditor per ${title}`,
    });
    await cardButton.waitFor({ state: 'visible', timeout: 10_000 });
    const [popup] = await Promise.all([page.waitForEvent('popup'), cardButton.click()]);
    return popup;
}
