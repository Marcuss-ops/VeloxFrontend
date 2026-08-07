import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Folders are an InstaEdit-owned catalog, not a Velox editor domain. */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'editor_folder_catalog_removed', owner: 'instaedit' },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'editor_folder_catalog_removed', owner: 'instaedit' },
    { status: 410 },
  );
}
