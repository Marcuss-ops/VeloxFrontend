import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- Mocks (set BEFORE bff.ts is statically imported so
// bff.ts's getCookie()/crypto.subtle reads go through our stubs). ----------

// Deterministic CSRF cookie without spinning up jsdom (vitest.config.ts
// for the dark_editor runs with environment: 'node').
const COOKIE_TOKEN = 'csrf-tok-abc';

Object.defineProperty(global, 'document', {
  value: { cookie: '' },
  configurable: true,
  writable: true,
});
Object.defineProperty(global.document, 'cookie', {
  configurable: true,
  get: () => `csrf_token=${COOKIE_TOKEN}; other_cookie=ignored`,
});

// minimal Response constructor for Node 18+ (vitest 0.x uses jsdom or
// node's WHATWG fetch impl; depending on the run we either have it or
// we don't — degrade gracefully).
type MinimalResponse = {
  status: number;
  statusText?: string;
  ok: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};
function makeResponse(
  status: number,
  body: unknown
): MinimalResponse & { statusText: string } {
  return {
    status,
    statusText: status === 200 ? 'OK' : status === 204 ? 'No Content' : 'Error',
    ok: status >= 200 && status < 300,
    headers: {
      get(name: string) {
        if (name.toLowerCase() === 'content-type') return 'application/json';
        return null;
      },
    },
    json: async () => body,
  };
}

// fetch spy: capture every call + replay queued responses in order.
type FetchCall = {
  url: string;
  init: RequestInit;
};
const fetchCalls: FetchCall[] = [];
type QueuedResp = MinimalResponse | (() => MinimalResponse);
let queuedResponses: QueuedResp[] = [];

const fetchMock = vi.fn(
  (input: RequestInfo | URL, init?: RequestInit): Promise<MinimalResponse> => {
    const url = typeof input === 'string' ? input : input.toString();
    fetchCalls.push({ url, init: init ?? {} });
    const next = queuedResponses.shift();
    const resp: MinimalResponse =
      typeof next === 'function' ? next() : (next as MinimalResponse);
    return Promise.resolve(resp);
  },
);
(globalThis as unknown as { fetch: typeof fetch }).fetch =
  fetchMock as unknown as typeof fetch;

// crypto.subtle stub (used by uploadMediaAsset indirectly). We don't
// exercise uploadMediaAsset in this test file but the global guards
// the next test suite that does.
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (_alg: string, _data: ArrayBuffer) => {
        const seed = new Uint8Array(32);
        for (let i = 0; i < seed.length; i++) seed[i] = i;
        return seed.buffer;
      },
    },
  },
  configurable: true,
});

// ---------- SUT (static import — order is fine because bff.ts reads
// globals at call time, not at module load time) ----------
import {
  publishEditorSession,
  updateEditorSessionThumbnail,
} from '../bff';

// ---------- helpers ----------
function clearEnv(): void {
  fetchCalls.length = 0;
  queuedResponses = [];
  fetchMock.mockClear();
}

// ---------- tests ----------

describe('publishEditorSession (BFF client)', () => {
  beforeEach(() => {
    clearEnv();
  });
  afterEach(() => {
    clearEnv();
  });

  it('POSTs to /api/v1/youtube/editor-sessions/by-project/{id}/publish with the P1+ payload shape', async () => {
    queuedResponses = [
      makeResponse(200, {
        public_url: 'https://youtube.com/watch?v=abc',
        video_id: 'abc',
        privacy_status: 'public',
        published_at: null,
      }),
    ];

    const ok = await publishEditorSession('ve_proj_test_123', {
      title: 'Titolo principale',
      description: 'Descrizione principale',
      privacy_status: 'public',
      publish_at: null,
      tags: ['news', 'italia', 'video'],
      default_language: 'it',
      default_audio_language: 'it',
      translations: {
        en: { title: 'English title', description: 'English description' },
        pt: { title: 'Título em português', description: 'Descrição' },
      },
    });

    expect(ok.public_url).toMatch(/youtube\.com\/watch\?v=abc/);
    expect(ok.privacy_status).toBe('public');

    // Exactly one fetch was made.
    expect(fetchCalls).toHaveLength(1);
    const call = fetchCalls[0];
    expect(call.url).toBe(
      '/api/v1/youtube/editor-sessions/by-project/ve_proj_test_123/publish',
    );
    expect(call.init.method).toBe('POST');

    // CSRF + content-type + credentials are auto-injected on POST.
    const headers = (call.init.headers ?? {}) as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe(COOKIE_TOKEN);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
    expect(call.init.credentials).toBe('include');

    // Body round-trips: json-stringified, then re-parsed + deep equal.
    const sent = JSON.parse(call.init.body as string);
    expect(sent).toEqual({
      title: 'Titolo principale',
      description: 'Descrizione principale',
      privacy_status: 'public',
      publish_at: null,
      tags: ['news', 'italia', 'video'],
      default_language: 'it',
      default_audio_language: 'it',
      translations: {
        en: { title: 'English title', description: 'English description' },
        pt: { title: ' Título em português', description: 'Descrição' },
      },
    });
  });

  it('accepts a minimal payload (only title + privacy) and undefined fields are not serialized', async () => {
    queuedResponses = [
      makeResponse(200, {
        public_url: 'https://youtube.com/watch?v=min',
        video_id: 'min',
        privacy_status: 'public',
      }),
    ];

    await publishEditorSession('ve_proj_min', {
      title: 'Minimum',
      privacy_status: 'public',
    });

    expect(fetchCalls).toHaveLength(1);
    const sent = JSON.parse(fetchCalls[0].init.body as string);
    expect(sent).toEqual({
      title: 'Minimum',
      privacy_status: 'public',
    });
    // Undefined fields are NOT serialized to "" — the operator's empty
    // form values must not leak as `tags: ""` etc.
    expect(sent.tags).toBeUndefined();
    expect(sent.translations).toBeUndefined();
    expect(sent.default_language).toBeUndefined();
    expect(sent.description).toBeUndefined();
  });

  it('throws an Error merging the backend `error` message on 4xx', async () => {
    queuedResponses = [
      makeResponse(400, { error: 'too many tags: 31 (max 30)' }),
    ];

    await expect(
      publishEditorSession('ve_proj_reject', {
        title: 'X',
        privacy_status: 'public',
        tags: new Array(31).fill('t'),
      }),
    ).rejects.toThrow(/too many tags/);
  });

  it('updateEditorSessionThumbnail PATCHes /by-project/{id} with thumbnail_media_id', async () => {
    queuedResponses = [makeResponse(204, null)];
    await updateEditorSessionThumbnail('ve_proj_patch', 'media-asset-uuid-123');

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(
      '/api/v1/youtube/editor-sessions/by-project/ve_proj_patch',
    );
    expect(fetchCalls[0].init.method).toBe('PATCH');
    expect(JSON.parse(fetchCalls[0].init.body as string)).toEqual({
      thumbnail_media_id: 'media-asset-uuid-123',
    });
    const headers = (fetchCalls[0].init.headers ?? {}) as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe(COOKIE_TOKEN);
    expect(fetchCalls[0].init.credentials).toBe('include');
  });
});
