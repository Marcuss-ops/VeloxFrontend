import { proxyToGo } from '@/lib/api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type Params = Promise<{ path?: string[] }>;

async function handle(request: Request, params: Params): Promise<Response> {
  const { path = [] } = await params;
  const suffix = `/${path.map(encodeURIComponent).join('/')}`;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const upstreamPath = query ? `/api/v1/editor${suffix}?${query}` : `/api/v1/editor${suffix}`;
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.text();

  const headers: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  if (body) headers['content-type'] = request.headers.get('content-type') ?? 'application/json';

  const proxied = await proxyToGo(upstreamPath, {
    method: request.method,
    body,
    headers,
  });

  // A document is optional for a newly-created YouTube editor session. The
  // InstaEdit session endpoint remains the source of truth until the first
  // canvas save. Normalize the upstream Velox 404 to an explicit empty
  // document so the browser does not report a noisy failed resource before
  // the client falls back to the session thumbnail.
  if (
    request.method === 'GET' &&
    proxied.status === 404 &&
    path.length === 3 &&
    path[0] === 'projects' &&
    path[2] === 'document'
  ) {
    return Response.json({ document_exists: false }, { status: 200, headers: { 'cache-control': 'no-store' } });
  }

  return proxied;
}

export const GET = (request: Request, context: { params: Params }) => handle(request, context.params);
export const POST = (request: Request, context: { params: Params }) => handle(request, context.params);
export const PUT = (request: Request, context: { params: Params }) => handle(request, context.params);
export const PATCH = (request: Request, context: { params: Params }) => handle(request, context.params);
export const DELETE = (request: Request, context: { params: Params }) => handle(request, context.params);
