#!/usr/bin/env bash
# run-e2e-live.sh — sibling orchestration for the LIVE variant of the
# cross_repo_smoke spec.
#
# Usage:
#   bash web/scripts/run-e2e-live.sh
# or via npm:
#   npm run test:e2e:live
#
# Lifecycle:
#   1. docker compose up -d --wait (boots Postgres / InstaeditLogin / Velox)
#   2. Readiness probes for InstaeditLogin (:8080) + Velox DataServer (:8000)
#      — each max 60s; 401/403/404 on / = healthy (server up; the path may
#      not be public). The InstaeditLogin probe also accepts 200 (a session
#      cookie supplied by the spec would render the canonical /auth/me 200).
#   3. Run MOCK=false playwright on the cross_repo_smoke spec.
#   4. Compose down -v --remove-orphans (ALWAYS, regardless of test exit code).
#   5. Exit with the Playwright exit code so CI sees pass/fail correctly.

set -uo pipefail

# Pre-flight: curl is required for the readiness probes.
if ! command -v curl >/dev/null 2>&1; then
    echo "[run-e2e-live] FATAL: curl not found on PATH; install curl or update this script to use wget." >&2
    exit 4
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../docker-compose-e2e.yml"
COMPOSE_FILE="$(cd "$(dirname "${COMPOSE_FILE}")" && pwd)/$(basename "${COMPOSE_FILE}")"

# Canonical listen ports per Velox's velox-server.env.example (8000 master)
# and instaledit BFF (PORT env, default 8080).
INSTAEDIT_PROBE_URL="http://127.0.0.1:8080/api/v1/auth/me"
VELOX_PROBE_URL="http://127.0.0.1:8000/"

PLAYWRIGHT_EXIT=0
COMPOSE_UP_OK=0

log() { printf '%s\n' "[run-e2e-live] $*" >&2; }

cleanup() {
    if [ "${COMPOSE_UP_OK}" -eq 1 ]; then
        log "docker compose down -v --remove-orphans"
        docker compose -f "${COMPOSE_FILE}" down -v --remove-orphans || true
    fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# 1. Bring up the cross-repo infra
# ---------------------------------------------------------------------------
log "Bringing up cross-repo E2E infra via ${COMPOSE_FILE}"
COMPOSE_UP_OK=1
docker compose -f "${COMPOSE_FILE}" up -d --wait || {
    log "docker compose up --wait failed; tearing down."
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Readiness probes
# ---------------------------------------------------------------------------
probe_url() {
    local url="$1"
    local want_codes="$2"  # comma-separated list of acceptable codes
    for _ in $(seq 1 60); do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${url}" || echo "000")
        for ok in ${want_codes//,/ }; do
            if [ "${code}" = "${ok}" ]; then
                log "Probe OK: ${url} -> ${code}"
                return 0
            fi
        done
        sleep 1
    done
    log "Probe FAIL: ${url} never returned one of ${want_codes} after 60s"
    return 1
}

log "Probing InstaeditLogin (${INSTAEDIT_PROBE_URL}); 401 (auth-less) or 200 healthy."
probe_url "${INSTAEDIT_PROBE_URL}" "401,200" || exit 2

log "Probing Velox DataServer (${VELOX_PROBE_URL}); 401|403|404 healthy (server up)."
probe_url "${VELOX_PROBE_URL}" "401,403,404" || exit 3

# ---------------------------------------------------------------------------
# 3. Run the cross_repo_smoke spec in live mode
# ---------------------------------------------------------------------------
cd "${SCRIPT_DIR}/.."
log "Running: MOCK=false npx playwright test e2e/cross_repo_smoke.spec.ts"
MOCK=false npx playwright test e2e/cross_repo_smoke.spec.ts --reporter=list
PLAYWRIGHT_EXIT=$?

# ---------------------------------------------------------------------------
# 4. Compose down handled by trap
# ---------------------------------------------------------------------------
log "Playwright exit code: ${PLAYWRIGHT_EXIT}"
exit "${PLAYWRIGHT_EXIT}"
