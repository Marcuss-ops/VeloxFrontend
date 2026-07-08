import { NextRequest, NextResponse } from 'next/server';
import { getTempFile } from '@/lib/server-utils';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;

  // Basic path traversal prevention
  if (filename.includes('..') || filename.includes('/')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const buffer = getTempFile(filename);
  if (!buffer) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
