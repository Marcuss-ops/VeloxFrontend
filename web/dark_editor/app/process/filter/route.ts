import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getTempFile, generateFilename, getTempDir, getTempFileUrl } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export interface FilterRequest {
  filename: string;
  filter_type: string;
  value: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: FilterRequest = await request.json();
    const { filename, filter_type, value } = body;

    if (!filename || !filter_type) {
      return NextResponse.json({ error: 'filename and filter_type are required' }, { status: 400 });
    }

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Clamp value to safe bounds
    const clampedValue = Math.max(-100, Math.min(100, value));

    const buffer = getTempFile(filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    const sharp = (await import('sharp')).default;
    let image = sharp(buffer);

    switch (filter_type) {
      case 'brightness':
        image = image.modulate({ brightness: clampedValue });
        break;
      case 'contrast':
        image = image.linear(clampedValue, -(128 * clampedValue) + 128);
        break;
      case 'saturation':
        image = image.modulate({ saturation: clampedValue });
        break;
      case 'blur':
        image = image.blur(Math.max(0.3, Math.min(100, clampedValue * 10)));
        break;
      case 'sharpen':
        image = image.sharpen({ sigma: Math.max(0.3, Math.min(10, clampedValue * 5)) });
        break;
      case 'grayscale':
        image = image.grayscale();
        break;
      case 'sepia':
        image = image.tint({ r: 112, g: 66, b: 20 });
        break;
      case 'invert':
        image = image.negate();
        break;
      default:
        return NextResponse.json({ error: `Unknown filter type: ${filter_type}` }, { status: 400 });
    }

    const outputFilename = generateFilename('png');
    const outputPath = path.join(getTempDir(), outputFilename);
    await image.png().toFile(outputPath);

    return NextResponse.json({
      filename: outputFilename,
      url: getTempFileUrl(outputFilename),
    });
  } catch (error) {
    console.error('[filter] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Filter failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
