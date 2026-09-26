// lib/hash.ts — Single authority for content hashing in the browser.
//
// Previously implemented twice (lib/api/bff/client.ts for upload-presign
// and lib/canvasPreview.ts for export snapshots); both now delegate here.
// Both public surfaces keep re-exporting the function so existing import
// sites and test mocks keep resolving.

/** SHA-256 hash of a Blob as lowercase hex. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
