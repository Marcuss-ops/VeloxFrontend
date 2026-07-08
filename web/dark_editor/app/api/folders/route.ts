import { NextRequest, NextResponse } from 'next/server';
import { listFolders, createFolder } from '@/lib/folders';

export const dynamic = 'force-dynamic';

// GET /api/folders - list folders
export async function GET() {
  try {
    const folders = listFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('[folders] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to list folders' },
      { status: 500 }
    );
  }
}

// POST /api/folders - create folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const folder = createFolder(body.name, body.parent_id ?? null);
    return NextResponse.json(folder);
  } catch (error) {
    console.error('[folders] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
