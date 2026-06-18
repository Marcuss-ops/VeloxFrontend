import { proxyToGo } from '@/lib/api-proxy';
import { DEMO_GROUPS, DEMO_VIDEOS } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = Promise<{ path?: string[] }>;

async function handle(request: Request, params: Params): Promise<Response> {
  const { path = [] } = await params;
  const suffix = `/${path.map(encodeURIComponent).join('/')}`;

  // Preserve the original query string so the backend receives ?group_name=... etc.
  const url = new URL(request.url);
  const queryString = url.searchParams.toString();
  const pathWithQuery = queryString ? `/api/v1/youtube${suffix}?${queryString}` : `/api/v1/youtube${suffix}`;

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.text();

  const proxied = await proxyToGo(pathWithQuery, {
    method: request.method,
    body,
    headers: body ? { 'content-type': request.headers.get('content-type') ?? 'application/json' } : undefined,
  });

  if (proxied.status !== 503) return proxied;

  const groupName = url.searchParams.get('group_name') ?? 'Amish';

  if (suffix === '/groups') {
    return Response.json({ ok: true, groups: DEMO_GROUPS, count: DEMO_GROUPS.length });
  }

  if (suffix.startsWith('/feed')) {
    return Response.json({ ok: true, videos: DEMO_VIDEOS[groupName] ?? [] });
  }

  return Response.json({ ok: false, error: 'demo_fallback' }, { status: 200 });
}

export const GET = (request: Request, context: { params: Params }) => handle(request, context.params);
export const POST = (request: Request, context: { params: Params }) => handle(request, context.params);
export const PUT = (request: Request, context: { params: Params }) => handle(request, context.params);
export const PATCH = (request: Request, context: { params: Params }) => handle(request, context.params);
export const DELETE = (request: Request, context: { params: Params }) => handle(request, context.params);
