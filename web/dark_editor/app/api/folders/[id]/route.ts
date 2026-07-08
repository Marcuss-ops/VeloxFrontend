import { NextRequest, NextResponse } from 'next/server';
import { getFolder, updateFolder, deleteFolder } from '@/lib/folders';

export const dynamic = 'force-dynamic';

// GET /api/folders/[id] - get single folder
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const folder = getFolder(id);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('[folders] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to get folder' },
      { status: 500 }
    );
  }
}

// PUT /api/folders/[id] - update folder
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updated = updateFolder(id, {
      name: body.name,
      parent_id: body.parent_id,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[folders] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id] - delete folder
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = deleteFolder(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[folders] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
