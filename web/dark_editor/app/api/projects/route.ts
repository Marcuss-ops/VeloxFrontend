import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const retiredResponse = () => NextResponse.json(
  {
    ok: false,
    error: 'editor_project_context_required',
    owner: 'instaedit',
  },
  { status: 410 },
);

/** Velox never lists or creates a global project catalog. */
export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
