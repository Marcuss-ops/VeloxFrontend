#!/usr/bin/env bash
# cleanup-ports.sh
#
# Release ports :3000 and :3001 held by stale dev processes so subsequent
# Playwright invocations can start the dual webServer (Vite SPA + dark_editor)
# without EADDRINUSE on interrupted runs.
#
# Strategy
#   1. Pattern-based kills (next dev / next-server / vite / esbuild)
#   2. Port-based kills via lsof (or fuser as a Linux fallback)
#   3. Brief grace period for the kernel to release TIME_WAIT sockets
#   4. Verify ports are free (best-effort; log warning if still busy)
#
# Idempotent: always exit 0. Missing patterns / unbound ports / no
# matching processes are NOT failures. The script is safe to chain before
# AND after every Playwright run.
#
# Usage
#   bash e2e/scripts/cleanup-ports.sh              # CI / npm test:e2e:cleanup
#   bash e2e/scripts/cleanup-ports.sh && playwright test && bash e2e/scripts/cleanup-ports.sh

set -u

PORTS=(3000 3001)
PATTERNS=('next dev' 'next-server' 'vite' 'esbuild')

log() { printf '%s\n' "[cleanup-ports] $*" >&2; }

# ---------------------------------------------------------------------------
# 1. Pattern-based kills
# ---------------------------------------------------------------------------
# pgrep returns non-zero when no processes match; we tolerate that.
kill_pattern() {
    local pat="$1"
    local pids
    pids=$(pgrep -f "$pat" 2>/dev/null || true)
    if [ -n "${pids}" ]; then
        log "Killing processes matching pattern '${pat}' (pids: ${pids})"
        # shellcheck disable=SC2086
        kill -9 ${pids} 2>/dev/null || true
    fi
}

for pat in "${PATTERNS[@]}"; do
    kill_pattern "${pat}"
done

# ---------------------------------------------------------------------------
# 2. Port-based kills (lsof preferred, fuser fallback on Linux)
# ---------------------------------------------------------------------------
kill_port() {
    local port="$1"
    local pids=""
    if command -v lsof >/dev/null 2>&1; then
        # lsof is portable across macOS + Linux.
        pids=$(lsof -ti tcp:"${port}" 2>/dev/null || true)
    elif command -v fuser >/dev/null 2>&1; then
        # fuser output may mix PIDs into stdout/stderr; capture only the PID column.
        pids=$(fuser "${port}/tcp" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)
    fi

    if [ -n "${pids}" ]; then
        log "Killing :${port} holders (pids: ${pids})"
        # shellcheck disable=SC2086
        kill -9 ${pids} 2>/dev/null || true
    fi
}

for port in "${PORTS[@]}"; do
    kill_port "${port}"
done

# ---------------------------------------------------------------------------
# 3. Brief grace period so the kernel releases TIME_WAIT sockets
# ---------------------------------------------------------------------------
# Try a TCP-level probe to verify release before the next wait tick.
wait_for_release() {
    local port="$1"
    local probe_pid
    # nc -z returns 0 if the connection succeeds (port bound), 1 if refused.
    if command -v nc >/dev/null 2>&1; then
        for _ in 1 2 3 4 5; do
            if ! nc -z 127.0.0.1 "${port}" 2>/dev/null; then
                return 0
            fi
            sleep 1
        done
    else
        # No nc — sleep unconditionally.
        sleep 2
    fi
}

wait_for_release 3000
wait_for_release 3001

# ---------------------------------------------------------------------------
# 4. Verify ports are free (best effort; warn if still busy)
# ---------------------------------------------------------------------------
verify_port() {
    local port="$1"
    local busy=0
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti tcp:"${port}" >/dev/null 2>&1 && busy=1
    elif command -v fuser >/dev/null 2>&1; then
        fuser "${port}/tcp" >/dev/null 2>&1 && busy=1
    fi
    if [ "${busy}" -eq 1 ]; then
        log "WARN: :${port} still busy after cleanup (likely a process owned by another user or root)"
    fi
}

for port in "${PORTS[@]}"; do
    verify_port "${port}"
done

# Always exit 0 so the script is safe to chain in CI:
#   test:e2e:cleanup -> cleanup && playwright && cleanup
exit 0
