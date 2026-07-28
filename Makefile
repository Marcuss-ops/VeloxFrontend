# Makefile at VeloxFrontend repo root.
# First top-level Makefile for the project — convention: lowercase
# targets, .PHONY for non-file targets.

# ---------------------------------------------------------------------------
# OpenAPI contract sync
# ---------------------------------------------------------------------------
# The contract test at web/dark_editor/__tests__/publishResponseContract.test.ts
# reads web/dark_editor/api/openapi.yaml (a vendored copy of
# InstaeditLogin/api/openapi.yaml) and asserts the schema matches the
# Go DTO + InstaeditLogin's canonical OpenAPI. The CI check in
# .github/workflows/integration-fast.yml fetches the canonical from
# GitHub and diffs against the vendored body (after the
# END_VENDORED_HEADER marker); if the vendored copy drifts, CI fails.
#
# Run this target before any push that touches the publish response
# contract on either side. The script prefers a local sibling
# InstaeditLogin directory ($INSTAEDITLOGIN_PATH override) and falls
# back to `curl` against raw.githubusercontent.com.
.PHONY: sync-openapi
sync-openapi:
	./scripts/sync-openapi-from-instaeditlogin.sh
