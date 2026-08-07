#!/usr/bin/env bash
# scripts/sync-openapi-from-instaeditlogin.sh
#
# Sync VeloxFrontend/web/dark_editor/api/openapi.yaml from
# InstaeditLogin/api/openapi.yaml. The vendored copy is read by
# the contract test at:
#   web/dark_editor/__tests__/publishResponseContract.test.ts
#   web/dark_editor/__tests__/projectBridgeOwnership.test.ts
# and asserted to match the canonical by the CI check in
# .github/workflows/integration-fast.yml.
#
# Source preference (in order):
#   1. $INSTAEDITLOGIN_PATH/api/openapi.yaml (default: sibling
#      InstaeditLogin/ directory relative to the VeloxFrontend
#      repo root)
#   2. https://raw.githubusercontent.com/Marcuss-ops/InstaeditLogin/main/api/openapi.yaml
#
# The vendored header is defined inline in this script (NOT read
# from the existing vendored copy) — this prevents accidental edits
# to the header from silently persisting. The marker line
#   `# >>> END_VENDORED_HEADER - do not remove this marker <<<`
# separates the header from the canonical content. CI uses this
# marker to strip the header before diffing against the canonical.
#
# Usage:
#   ./scripts/sync-openapi-from-instaeditlogin.sh
#   INSTAEDITLOGIN_PATH=/path/to/InstaeditLogin \
#     ./scripts/sync-openapi-from-instaeditlogin.sh
#
# Exit codes:
#   0  - vendored copy written (or already in sync)
#   1  - source unavailable (no local file AND GitHub fetch failed)
#   2  - shell error (set -euo pipefail)

set -euo pipefail

# Locate VeloxFrontend repo root (parent of scripts/)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDORED_PATH="$REPO_ROOT/web/dark_editor/api/openapi.yaml"

# Default local path: sibling InstaeditLogin directory
if [[ -z "${INSTAEDITLOGIN_PATH:-}" ]]; then
  if [[ -d "$REPO_ROOT/../InstaeditLogin" ]]; then
    INSTAEDITLOGIN_PATH="$(cd "$REPO_ROOT/../InstaeditLogin" && pwd)"
  fi
fi

GITHUB_FALLBACK="https://raw.githubusercontent.com/Marcuss-ops/InstaeditLogin/main/api/openapi.yaml"

# Vendored header (defined inline; do NOT read from existing vendored
# copy). The marker line MUST stay in sync with the CI check's
# grep -n 'END_VENDORED_HEADER' lookup.
VENDORED_HEADER=$(cat <<'EOF'
# =========================================================
# VENDORED COPY — DO NOT EDIT HERE
# =========================================================
# Source of truth: InstaeditLogin/api/openapi.yaml
# Sync cadence:     manual (run `make sync-openapi` before any
#                   push that touches the API or project-bridge contract)
# Project bridge:   InstaEdit is the source of truth; Velox receives only
#                   an opaque project context. No bidirectional catalog sync.
# Two contract test locations (must stay in sync):
#   InstaeditLogin/pkg/api/youtube_editor_sessions_contract_test.go
#   VeloxFrontend/web/dark_editor/__tests__/publishResponseContract.test.ts
# =========================================================
# >>> END_VENDORED_HEADER - do not remove this marker <<<
EOF
)

# Decide source
SOURCE=""
TMP_SOURCE=""
if [[ -n "${INSTAEDITLOGIN_PATH:-}" && -f "$INSTAEDITLOGIN_PATH/api/openapi.yaml" ]]; then
  echo "==> Source: local $INSTAEDITLOGIN_PATH/api/openapi.yaml"
  SOURCE="$INSTAEDITLOGIN_PATH/api/openapi.yaml"
else
  echo "==> Local not found, falling back to GitHub: $GITHUB_FALLBACK"
  TMP_SOURCE=$(mktemp)
  if ! curl -fsSL "$GITHUB_FALLBACK" -o "$TMP_SOURCE"; then
    echo "ERROR: failed to fetch $GITHUB_FALLBACK" >&2
    echo "       (and no local InstaeditLogin found at INSTAEDITLOGIN_PATH='${INSTAEDITLOGIN_PATH:-}')" >&2
    exit 1
  fi
  SOURCE="$TMP_SOURCE"
  trap "rm -f $TMP_SOURCE" EXIT
fi

# Ensure target directory exists
mkdir -p "$(dirname "$VENDORED_PATH")"

# Build new vendored copy: header + canonical content
TMP_OUTPUT=$(mktemp)
{
  printf "%s\n" "$VENDORED_HEADER"
  cat "$SOURCE"
} > "$TMP_OUTPUT"

# Atomic replace
mv "$TMP_OUTPUT" "$VENDORED_PATH"
LINES=$(wc -l < "$VENDORED_PATH")
SIZE=$(wc -c < "$VENDORED_PATH")
echo "==> Wrote $VENDORED_PATH ($LINES lines, $SIZE bytes)"
