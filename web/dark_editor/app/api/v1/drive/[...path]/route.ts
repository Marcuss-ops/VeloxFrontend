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
  const upstreamPath = query ? `/api/v1/drive${suffix}?${query}` : `/api/v1/drive${suffix}`;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const headers: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  if (body) headers['content-type'] = request.headers.get('content-type') ?? 'application/json';
  return proxyToGo(upstreamPath, { method: request.method, body, headers });
}

export const GET = (request: Request, context: { params: Params }) => handle(request, context.params);
