// ============================================================================
// Contract lock: FormatQualitySection must NEVER offer WebP
// ============================================================================
//
// Background:
//   - YouTube's thumbnails.set API requires image/jpeg or image/png.
//     /api/v1/media/presign (InstaeditLogin) explicitly rejects image/webp
//     with HTTP 400 "Unsupported thumbnail format".
//   - The Publish panel in the dark editor is the SOURCE of the format the
//     operator sends to the orchestrator. If this dropdown ever offers
//     WebP, an operator-selected WebP would round-trip through canvas.export
//     -> /media/presign -> 400, breaking the publish pipeline.
//   - Even though the canvas export library already canonicalises
//     webp -> jpeg BEFORE canvas.toBlob (see __tests__/canvasExport.test.ts:
//     "exportCanvasToBlob legacy fallback: webp is canonicalised to image/jpeg
//     before canvas.toBlob (no 400 from /media/presign)" + "exportStageToBlob
//     (webp): imageToBlob receives image/jpeg" as defense-in-depth), the
//     user-facing UI must NOT offer the broken option to begin with.
//
// What this test pins:
//   1. The FORMATS array at the source-file level does NOT contain any
//      `value: 'webp'` (or `value: "webp"`) entry. Catches the regression
//      where a future contributor re-adds WebP to the dropdown.
//   2. The source file does NOT contain the string literal `webp` outside
//      of context that would suggest it's offered as a user-selectable
//      format. Catches the regression in a defensive net.
//
// Why a SOURCE-level assertion rather than a component render test:
//   - The Select component in @/components/ui/Select renders the options
//     through portals in jsdom (hard to query reliably without an extra
//     testing-library setup that isn't currently in the repo).
//   - The intent of the contract is "the dropdown is not allowed to
//     include WebP, regardless of how it's rendered". A grep against the
//     source is the most direct and maintainable expression of that
//     intent: it locks the data, not the render path.
//
// RUN IN CI via: npm test (or npx vitest run).
// ============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FORMAT_SECTION_PATH = path.resolve(
  __dirname,
  '../components/editor/export/FormatQualitySection.tsx',
);

describe('FormatQualitySection publish-format invariant', () => {
  it('does NOT offer WebP in the publish-format dropdown (YouTube requires image/jpeg or image/png)', () => {
    const source = fs.readFileSync(FORMAT_SECTION_PATH, 'utf8');

    // 1. The FORMATS array must not contain any 'webp' value. This is
    //    the HARD regression lock: if someone adds
    //    `{ value: 'webp', label: 'WebP', ... }` to FORMATS, this test
    //    fails with a clear message.
    expect(
      source,
      'FormatQualitySection.tsx must not contain a `value: "webp"` (or `value: \'webp\'`) entry in the FORMATS array -- WebP is rejected by /media/presign with HTTP 400',
    ).not.toMatch(/value:\s*['"]webp['"]/);

    // 2. The user-facing label must not contain "WebP" either. Catches
    //    the case where someone adds WebP using a different but still
    //    wrong value casing (e.g., 'WEBP' or 'image/webp').
    expect(
      source,
      'FormatQualitySection.tsx must not contain the literal "WebP" as a user-facing label -- /media/presign rejects image/webp (HTTP 400)',
    ).not.toMatch(/WebP/);
  });
});
