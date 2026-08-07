import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Individual folders are not part of the Velox editor context. */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'editor_folder_catalog_removed', owner: 'instaedit' },
    { status: 410 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { ok: false, error: 'editor_folder_catalog_removed', owner: 'instaedit' },
    { status: 410 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, error: 'editor_folder_catalog_removed', owner: 'instaedit' },
    { status: 410 },
  );
}
