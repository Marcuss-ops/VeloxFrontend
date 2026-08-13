// Single source of truth for "is this an InstaEdit-scoped editor project?".
//
// InstaEdit creates/authorizes opaque project handles with a `ve_` or `vx_`
// prefix; those documents are read/written through the project-scoped BFF,
// NOT the legacy local project catalog. Every layer (authorization,
// project client routing, editor hooks, ownership checks) must use THIS
// resolver so a `vx_` id can never slip through authorization only to hit
// the legacy `/api/projects` persistence.
//
// Keep the pattern in lockstep with the InstaEdit BFF parser: 128
// characters total, including the mandatory prefix.
const PROJECT_ID_PATTERN = /^(?:ve_|vx_)[A-Za-z0-9_-]{1,125}$/;

/** True when `value` is an InstaEdit-scoped editor project id (ve_/vx_). */
export function isScopedProjectId(value: string): boolean {
  return PROJECT_ID_PATTERN.test(value.trim());
}
