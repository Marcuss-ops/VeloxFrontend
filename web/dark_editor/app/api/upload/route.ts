import { NextRequest, NextResponse } from 'next/server';
import { saveToTemp, getTempFileUrl } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i;

/**
 * A file is image-like when the browser declares an image MIME type, OR the
 * declared type is missing / generic octet-stream and the name looks like
 * an image. Drag-and-drop from the OS or another page frequently declares
 * no type or application/octet-stream even for valid images.
 */
function isImageLike(file: File): boolean {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type.startsWith('image/');
  }
  return IMAGE_EXTENSION_PATTERN.test(file.name ?? '');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isImageLike(file)) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const filename = await saveToTemp(file);
    const url = getTempFileUrl(filename);

    return NextResponse.json({ filename, url });
  } catch (error) {
    console.error('[api/upload] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Upload failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
