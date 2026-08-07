import { NextRequest, NextResponse } from 'next/server';
import { saveToTemp, getTempFileUrl } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  const filename = await saveToTemp(file);
  return NextResponse.json({ filename, url: getTempFileUrl(filename) });
}
