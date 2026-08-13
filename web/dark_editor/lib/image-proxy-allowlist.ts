// Shared allowlist for the InstaEditor image proxy.
//
// SINGLE SOURCE OF TRUTH for which hosts the editor routes through
// /api/image-proxy. The client (lib/api/httpClient.editorImageProxyUrl)
// and the server route (app/api/image-proxy/route.ts) must agree: if the
// client proxy-wraps a URL the server rejects, the image deterministically
// 403s. Both sides import this predicate.
//
// YouTube thumbnail CDNs only (no CORS on these origins → must proxy).
export function isImageProxyHost(hostname: string): boolean {
  return /(^|\.)(ytimg\.com|youtube\.com)$/i.test(hostname);
}
