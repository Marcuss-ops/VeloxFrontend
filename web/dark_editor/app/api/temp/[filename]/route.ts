import { NextRequest, NextResponse } from 'next/server';
import { getTempFile } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ filename: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { filename } = await context.params;
  if (filename.includes('/') || filename.includes('..')) return new NextResponse('Not found', { status: 404 });
  const file = getTempFile(filename);
  return file ? new NextResponse(new Uint8Array(file), { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'private, max-age=3600' } }) : new NextResponse('Not found', { status: 404 });
}
