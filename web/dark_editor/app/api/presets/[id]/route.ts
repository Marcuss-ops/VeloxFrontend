import { NextRequest, NextResponse } from 'next/server';
import { getPreset, updatePreset, deletePreset } from '@/lib/presets-store';

export const dynamic = 'force-dynamic';

// GET /api/presets/[id] - get single preset
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const preset = getPreset(id);

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (error) {
    console.error('[presets] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to get preset' },
      { status: 500 }
    );
  }
}

// PUT /api/presets/[id] - update preset
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (body.type && body.type !== 'complete' && body.type !== 'text') {
      return NextResponse.json({ error: 'type must be "complete" or "text"' }, { status: 400 });
    }

    const updated = updatePreset(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[presets] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to update preset' },
      { status: 500 }
    );
  }
}

// DELETE /api/presets/[id] - delete preset
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = deletePreset(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[presets] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    );
  }
}
