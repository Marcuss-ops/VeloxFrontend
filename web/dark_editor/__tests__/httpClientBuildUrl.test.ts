// Regression test for the drop-upload 404 on the Vercel editor deploy.
//
// buildUrl('/api/upload') previously produced `/instaeditorapi/upload`
// (the leading slash of the path was stripped and concatenated directly
// onto API_BASE='/instaeditor'), so the browser requested a route that
// does not exist and the drop failed with 404 "Request failed". The URL
// must keep the separating slash: `/instaeditor/api/upload`.

import { describe, expect, it } from 'vitest';
import { API_BASE, buildUrl } from '@/lib/api/httpClient';

describe('buildUrl', () => {
  it('keeps the runtime base and the API path separated by a slash', () => {
    expect(buildUrl('/api/upload')).toBe(`${API_BASE}/api/upload`);
  });

  it('joins other API paths without duplicating or dropping the slash', () => {
    expect(buildUrl('/api/folders')).toBe(`${API_BASE}/api/folders`);
    expect(buildUrl('/process/filter')).toBe(`${API_BASE}/process/filter`);
    expect(buildUrl('/export')).toBe(`${API_BASE}/export`);
  });

  it('does not double-prefix a path that already starts with the runtime base', () => {
    const alreadyPrefixed = `${API_BASE}/api/upload`;
    expect(buildUrl(alreadyPrefixed)).toBe(alreadyPrefixed);
  });

  it('passes absolute URLs through unchanged', () => {
    expect(buildUrl('https://api.instaedit.org/api/upload')).toBe('https://api.instaedit.org/api/upload');
  });

  it('normalizes repeated leading slashes in the incoming path', () => {
    expect(buildUrl('//api/upload')).toBe(`${API_BASE}/api/upload`);
  });
});
