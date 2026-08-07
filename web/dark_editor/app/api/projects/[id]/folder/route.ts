import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Folder assignment is not a Velox-owned operation. */
export async function PUT() {
  return NextResponse.json(
    { ok: false, error: 'editor_folder_catalog_removed', owner: 'instaedit' },
    { status: 410 },
  );
}
