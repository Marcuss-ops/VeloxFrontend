import { NextRequest, NextResponse } from 'next/server';
import { listPresets, createPreset } from '@/lib/presets-store';

export const dynamic = 'force-dynamic';

// GET /api/presets - list presets
export async function GET() {
  try {
    const presets = listPresets();
    return NextResponse.json(presets);
  } catch (error) {
    console.error('[presets] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to list presets' },
      { status: 500 }
    );
  }
}

// POST /api/presets - create preset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
    }

    if (body.type !== 'complete' && body.type !== 'text') {
      return NextResponse.json({ error: 'type must be "complete" or "text"' }, { status: 400 });
    }

    const preset = createPreset(body);
    return NextResponse.json({ id: preset.id, message: 'Preset saved' });
  } catch (error) {
    console.error('[presets] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to save preset' },
      { status: 500 }
    );
  }
}
