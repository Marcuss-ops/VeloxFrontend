import { NextRequest, NextResponse } from 'next/server';
import { saveToTemp, getTempFileUrl } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const filename = await saveToTemp(file);
    const url = getTempFileUrl(filename);

    return NextResponse.json({ filename, url });
  } catch (error) {
    console.error('[upload] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Upload failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
