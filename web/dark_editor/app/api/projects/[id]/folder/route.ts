import { NextRequest, NextResponse } from 'next/server';
import { assignProjectToFolder } from '@/lib/projects-store';

export const dynamic = 'force-dynamic';

// PUT /api/projects/[id]/folder - assign project to folder
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const folderId = body.folder_id ?? null;

    const updated = assignProjectToFolder(id, folderId);

    if (!updated) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[projects/folder] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to assign project to folder' },
      { status: 500 }
    );
  }
}
