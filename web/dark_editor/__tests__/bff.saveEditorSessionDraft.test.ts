// Vitest test for the InstaEditor's saveEditorSessionDraft BFF helper.
//
// What is under test
// ==================
// The saveEditorSessionDraft export in web/dark_editor/lib/api/bff.ts
// (defined alongside publishEditorSession) wires the auto-save
// indicator + on-blur/dirty-form Persistence story. The contract is:
//
//   PUT /api/v1/youtube/editor-sessions/by-project/{veloxProjectId}/draft
//   Body: same as publish payload minus privacy resolution
//   Response: { draft_updated_at: ISO, draft_title, ..., draft_desired_privacy }
//
// Why this test exists
// ====================
//   - Regression guard against URL drift (a typo in the path would
//     silently never auto-save and the operator would lose data).
//   - Regression guard against CSRF wiring (the bffFetch helper adds
//     the X-CSRF-Token header for non-GET requests; losing the wireup
//     would silently 403 every auto-save).
//   - Confirms the response shape stays wide enough for the
//     "Bozza salvata hh:mm" indicator to render without a follow-up GET.
//
// Test harness
// ============
// Node-native fetch is intercepted via vi.stubGlobal. The real
// window.document.cookie reader is bypassed by setting csrf_token
// directly on the stubbed document. We do NOT exercise the editor
// form here — that's a separate react-testing-library suite; this
// test isolates the bff helper.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveEditorSessionDraft } from '../lib/api/bff';

describe('bff.saveEditorSessionDraft', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom-style minimal stub so the cookie reader returns a CSRF
    // token (the helper refuses POST bodies without one).
    (globalThis as unknown as { document: { cookie: string } }).document = {
      cookie: 'csrf_token=test-csrf; other=foo',
    };
    fetchMock = vi.fn();
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PUTs the draft shape to the by-project draft endpoint', async () => {
    const response = {
      velox_project_id: 've_1',
      draft_title: 'Titolo di prova',
      draft_description: 'Descrizione',
      draft_tags: ['news', 'italia'],
      draft_default_language: 'it',
      draft_default_audio_language: 'it',
      draft_translations: {
        en: { title: 'Test title', description: 'Test body' },
      },
      draft_desired_privacy: 'public',
      draft_updated_at: '2026-07-27T10:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => response,
    });

    const result = await saveEditorSessionDraft('ve_1', {
      title: 'Titolo di prova',
      description: 'Descrizione',
      tags: ['news', 'italia'],
      default_language: 'it',
      default_audio_language: 'it',
      translations: { en: { title: 'Test title', description: 'Test body' } },
      desired_privacy: 'public',
    });

    expect(result.draft_updated_at).toBe('2026-07-27T10:00:00.000Z');
    expect(result.draft_title).toBe('Titolo di prova');

    // Verify URL is the by-project draft endpoint, GET was NOT used,
    // CSRF header was sent, and body is the same JSON shape.
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('/api/v1/youtube/editor-sessions/by-project/ve_1/draft');
    expect(calledInit.method).toBe('PUT');
    expect(calledInit.credentials).toBe('include');
    expect(calledInit.headers['X-CSRF-Token']).toBe('test-csrf');
    expect(calledInit.headers['Content-Type']).toBe('application/json');
    const parsedBody = JSON.parse(calledInit.body);
    expect(parsedBody.title).toBe('Titolo di prova');
    expect(parsedBody.tags).toEqual(['news', 'italia']);
    expect(parsedBody.translations.en.title).toBe('Test title');
  });

  it('propagates the server error reason when the PUT fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ error: 'publish already in progress or terminal' }),
    });

    await expect(
      saveEditorSessionDraft('ve_1', { title: 't' })
    ).rejects.toThrow(/publish already in progress/);
  });

  it('tolerates a missing csrf cookie (header omitted, server returns 403 in production)', async () => {
    (globalThis as unknown as { document: { cookie: string } }).document.cookie = 'other=foo';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ draft_updated_at: '2026-07-27T10:00:00.000Z' }),
    });

    await saveEditorSessionDraft('ve_1', { title: 't' });
    const [, calledInit] = fetchMock.mock.calls[0];
    // The helper only sets X-CSRF-Token when getCookie found one.
    expect(calledInit.headers['X-CSRF-Token']).toBeUndefined();
  });
});
