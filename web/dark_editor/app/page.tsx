import { redirect } from 'next/navigation';
import { INSTAEDIT_APP_URL } from '@/lib/editor-runtime';

/**
 * The editor has no standalone landing surface: it is always opened with
 * an explicit project context (editor/{velox_project_id}) from InstaEdit.
 * Visiting the bare origin redirects straight back to the InstaEdit
 * Copertine hub instead of showing a dead-end marketing page.
 */
export default function Home() {
  redirect(`${INSTAEDIT_APP_URL}/app/covers`);
}
