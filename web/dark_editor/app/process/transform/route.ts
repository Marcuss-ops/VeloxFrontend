import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getTempFile, generateFilename, getTempDir, getTempFileUrl } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export interface TransformRequest {
  filename: string;
  crop_box?: [number, number, number, number];
  resize_dims?: [number, number];
}

export async function POST(request: NextRequest) {
  try {
    const body: TransformRequest = await request.json();
    const { filename, crop_box, resize_dims } = body;

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    if (!crop_box && !resize_dims) {
      return NextResponse.json({ error: 'crop_box or resize_dims is required' }, { status: 400 });
    }

    // Clamp resize dimensions to prevent DoS
    if (resize_dims) {
      resize_dims[0] = Math.max(1, Math.min(10000, resize_dims[0]));
      resize_dims[1] = Math.max(1, Math.min(10000, resize_dims[1]));
    }

    const buffer = getTempFile(filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    const sharp = (await import('sharp')).default;
    let image = sharp(buffer);
    const metadata = await image.metadata();

    if (crop_box) {
      const [left, top, right, bottom] = crop_box;
      const width = Math.max(1, right - left);
      const height = Math.max(1, bottom - top);
      image = image.extract({
        left: Math.max(0, Math.min(left, (metadata.width || width) - 1)),
        top: Math.max(0, Math.min(top, (metadata.height || height) - 1)),
        width,
        height,
      });
    }

    if (resize_dims) {
      const [width, height] = resize_dims;
      image = image.resize(Math.max(1, width), Math.max(1, height));
    }

    const outputFilename = generateFilename('png');
    const outputPath = path.join(getTempDir(), outputFilename);
    await image.png().toFile(outputPath);

    return NextResponse.json({
      filename: outputFilename,
      url: getTempFileUrl(outputFilename),
    });
  } catch (error) {
    console.error('[transform] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Transform failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
