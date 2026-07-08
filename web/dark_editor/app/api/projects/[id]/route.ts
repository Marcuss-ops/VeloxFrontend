import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject, deleteProject } from '@/lib/projects-store';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id] - get single project
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const project = getProject(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('[projects] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - delete project
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = deleteProject(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[projects] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
