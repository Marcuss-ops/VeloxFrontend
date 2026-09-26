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

    // Clamp value to the client contract: value ∈ [-100, 100].
    const clampedValue = Math.max(-100, Math.min(100, value));

    const buffer = getTempFile(filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    const sharp = (await import('sharp')).default;
    let image = sharp(buffer);

    // Unit contract: the client sends a signed percentage where 0 = neutral.
    // sharp's modulate multipliers are neutral at 1.0, so map via
    // factor = 1 + value/100 (never below 0). Contrast uses
    // out = (in - 128) * factor + 128, i.e. sharp.linear(factor, 128*(1-factor)).
    const brightnessFactor = Math.max(0, 1 + clampedValue / 100);

    switch (filter_type) {
      case 'brightness':
        image = image.modulate({ brightness: brightnessFactor });
        break;
      case 'contrast':
        image = image.linear(brightnessFactor, 128 * (1 - brightnessFactor));
        break;
      case 'saturation':
        image = image.modulate({ saturation: brightnessFactor });
        break;
      case 'blur':
        // Sigma in pixels: cap a +100 request at a sane 25px blur.
        image = image.blur(clampedValue <= 0 ? 0.3 : Math.min(25, Math.max(0.3, clampedValue / 10)));
        break;
      case 'sharpen':
        image = image.sharpen({ sigma: Math.min(10, Math.max(0.3, clampedValue / 10)) });
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
