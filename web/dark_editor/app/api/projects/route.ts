import { NextRequest, NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/projects-store';

export const dynamic = 'force-dynamic';

// GET /api/projects - list projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const projects = listProjects(type);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('[projects] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - create project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.canvas_json) {
      return NextResponse.json({ error: 'name and canvas_json are required' }, { status: 400 });
    }

    const project = createProject(body);
    return NextResponse.json({ id: project.id, message: 'Project saved' });
  } catch (error) {
    console.error('[projects] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to save project' },
      { status: 500 }
    );
  }
}
