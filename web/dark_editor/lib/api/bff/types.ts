// Shared BFF wire-type contract for the InstaEditor.
//
// PURE TYPE module — zero imports, zero runtime code. The shared HTTP
// infrastructure (bffFetch / bffPost / getCookie / BFF_BASE / sha256Hex /
// POLL_* constants) lives in lib/api/bff/client.ts. The YouTube wire types
// (YouTubeTranslation, Publish*/EditorSessionDetail/Draft* + the PollResult
// short-poll shape) live in youtube/types.ts — the authoritative contract —
// and are re-exported by youtube.ts.
//
// Each domain module declares its own wire types inline (auth.ts: BffUser;
// projects.ts: VeloxProject/VeloxJob/CreateVeloxJobRequest;
// socialDestinations.ts: SocialDestination) and the barrel bff.ts re-exports
// them, so this module now holds only the cross-module media-upload shape
// consumed by upload.ts.
//
// Originally a single 578-LOC monolith at lib/api/bff.ts; the type-only
// surface was extracted here so consumers can import the shape contract
// without dragging in the CSRF fetch helper.

// ------------------------------------------------------------------
// Media upload (thumbnails stored in InstaEdit before publishing)
// ------------------------------------------------------------------

export interface PresignMediaResponse {
  asset_id: string;
  upload_url: string;
  upload_method: string;
  upload_headers: Record<string, string>;
}
