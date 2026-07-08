import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getTempFile, generateFilename, getTempDir, getTempFileUrl } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export interface ExportRequest {
  filename: string;
  format: string;
  quality: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { filename, format, quality } = body;

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const buffer = getTempFile(filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    const sharp = (await import('sharp')).default;
    let image = sharp(buffer);

    const outputFilename = generateFilename(format || 'png');
    const outputPath = path.join(getTempDir(), outputFilename);

    if (format === 'jpg' || format === 'jpeg') {
      image = image.jpeg({ quality: quality || 90 });
    } else if (format === 'webp') {
      image = image.webp({ quality: quality || 90 });
    } else if (format === 'png') {
      image = image.png({ quality: quality || 100 });
    } else {
      image = image.png();
    }

    await image.toFile(outputPath);

    return NextResponse.json({
      filename: outputFilename,
      url: getTempFileUrl(outputFilename),
    });
  } catch (error) {
    console.error('[export] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Export failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
