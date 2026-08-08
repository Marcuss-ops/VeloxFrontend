import { proxyToGo } from '@/lib/api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type Params = Promise<{ path?: string[] }>;

const TRANSLATION_TIMEOUT_MS = 30_000;

async function translateDescriptionLocally(text: string, targetLanguage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
  try {
    const response = await fetch('http://127.0.0.1:8765/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, target_language: targetLanguage }),
      signal: controller.signal,
    });
    const payload = await response.json() as { translated_text?: string; error?: string };
    if (!response.ok || !payload.translated_text) throw new Error(payload.error || `local translator returned ${response.status}`);
    return payload.translated_text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function handle(request: Request, params: Params): Promise<Response> {
  const { path = [] } = await params;
  const suffix = `/${path.map(encodeURIComponent).join('/')}`;

  // Velox no longer owns a YouTube catalog. Groups, channels, associations,
  // feeds and direct video operations belong to InstaEdit; only the opaque
  // editor-session bridge and editor AI helpers remain available here.
  const isRetiredCatalogPath = [
    '/groups',
    '/channels',
    '/feed',
    '/group-videos',
    '/group-private-videos',
    '/videos',
  ].some((prefix) => suffix === prefix || suffix.startsWith(`${prefix}/`));
  if (isRetiredCatalogPath) {
    return Response.json(
      { ok: false, error: 'velox_youtube_catalog_removed', owner: 'instaedit' },
      { status: 410 },
    );
  }

  // Preserve the original query string so the backend receives editor-session parameters.
  const url = new URL(request.url);
  const queryString = url.searchParams.toString();
  const pathWithQuery = queryString ? `/api/v1/youtube${suffix}?${queryString}` : `/api/v1/youtube${suffix}`;

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.text();

  // Translation is served directly by this Next server so the NVIDIA key
  // never reaches the browser. The legacy Velox binary may not expose the
  // corresponding Go route, which previously returned a text 404 that the
  // client tried to parse as JSON.
  if (request.method === 'POST' && suffix === '/ai/translate') {
    if (!request.headers.get('cookie')) {
      return Response.json({ ok: false, error: 'authentication required' }, { status: 401 });
    }
    let input: { text?: string; target_language?: string; tone?: string; kind?: 'title' | 'description' | 'text' };
    try {
      input = JSON.parse(body || '{}') as typeof input;
    } catch {
      return Response.json({ ok: false, error: 'invalid request JSON' }, { status: 400 });
    }
    const text = String(input.text || '').trim();
    const targetLanguage = String(input.target_language || '').trim();
    if (!text || !targetLanguage) {
      return Response.json({ ok: false, error: 'text and target_language are required' }, { status: 400 });
    }
    if (input.kind === 'description' || input.kind === 'text') {
      try {
        const translated = await translateDescriptionLocally(text, targetLanguage);
        return Response.json({ ok: true, source_text: text, sanitized_text: text, translated_text: translated, target_language: targetLanguage, provider: 'argos-local' });
      } catch (error) {
        return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Local description translation failed' }, { status: 502 });
      }
    }
    const apiKey = process.env.NVIDIA_API_KEY || process.env.VELOX_NVIDIA_API_KEY || '';
    if (!apiKey) {
      return Response.json({ ok: false, error: 'NVIDIA API key is not configured' }, { status: 503 });
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
      const upstream = await fetch(process.env.NVIDIA_TEXT_URL || process.env.VELOX_NVIDIA_TEXT_URL || 'https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: 'You are a translation engine. Return only the translated text, without quotes, notes, markdown or explanations.' },
            { role: 'user', content: `Translate the following text into ${targetLanguage}. Tone: ${input.tone || 'natural YouTube'}; preserve meaning:\n\n${text}` },
          ],
          temperature: 0.2,
          max_tokens: 512,
        }),
      });
      clearTimeout(timeout);
      const raw = await upstream.text();
      let payload: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      try { payload = JSON.parse(raw) as typeof payload; } catch { payload = {}; }
      if (!upstream.ok) {
        const status = upstream.status === 429 ? 429 : 502;
        const responseHeaders = new Headers();
        if (status === 429) responseHeaders.set('Retry-After', upstream.headers.get('retry-after') || '10');
        return Response.json(
          { ok: false, error: payload.error?.message || `NVIDIA request failed (${upstream.status})`, retryable: status === 429 },
          { status, headers: responseHeaders },
        );
      }
      const translated = payload.choices?.[0]?.message?.content?.trim();
      if (!translated) return Response.json({ ok: false, error: 'NVIDIA returned empty translation' }, { status: 502 });
      return Response.json({ ok: true, source_text: text, sanitized_text: text, translated_text: translated, target_language: targetLanguage, provider: 'nvidia' });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : 'NVIDIA translation failed' }, { status: 502 });
    }
  }

  const headers: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  if (body) headers['content-type'] = request.headers.get('content-type') ?? 'application/json';

  const proxied = await proxyToGo(pathWithQuery, {
    method: request.method,
    body,
    headers,
  });

  return proxied;
}

export const GET = (request: Request, context: { params: Params }) => handle(request, context.params);
export const POST = (request: Request, context: { params: Params }) => handle(request, context.params);
export const PUT = (request: Request, context: { params: Params }) => handle(request, context.params);
export const PATCH = (request: Request, context: { params: Params }) => handle(request, context.params);
export const DELETE = (request: Request, context: { params: Params }) => handle(request, context.params);
