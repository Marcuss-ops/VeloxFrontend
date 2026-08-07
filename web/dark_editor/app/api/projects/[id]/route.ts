import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProject, updateProject } from '@/lib/projects-store';
import { authorizeEditorProject } from '@/lib/editor-ownership';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

async function authorize(request: NextRequest, id: string): Promise<NextResponse | null> {
  const result = await authorizeEditorProject(request, id);
  return result.ok ? null : NextResponse.json(
    { ok: false, error: result.error, owner: 'instaedit' },
    { status: result.status },
  );
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const denied = await authorize(request, id);
  if (denied) return denied;
  const project = getProject(id);
  return project
    ? NextResponse.json(project)
    : NextResponse.json({ error: 'Project not found' }, { status: 404 });
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const denied = await authorize(request, id);
  if (denied) return denied;
  const body = await request.json();
  const project = updateProject(id, body);
  return project
    ? NextResponse.json(project)
    : NextResponse.json({ error: 'Project not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const denied = await authorize(request, id);
  if (denied) return denied;
  return deleteProject(id)
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Project not found' }, { status: 404 });
}
