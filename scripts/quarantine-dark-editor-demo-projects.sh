#!/usr/bin/env bash
set -euo pipefail

# Reversible cleanup for the legacy local Dark Editor JSON store.
# Safety contract:
#   - dry-run is the default;
#   - --apply is required before changing projects.json;
#   - only the two exact historical synthetic fingerprints below qualify;
#   - bridged/opaque projects and every ambiguous record survive untouched;
#   - apply writes a backup, quarantine manifest, checksum report, and then
#     atomically replaces projects.json.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DARK_EDITOR_DATA_DIR:-$REPO_ROOT/web/dark_editor/data}"
APPLY=0
REPORT_FILE=""

usage() {
  cat <<'USAGE'
Usage: quarantine-dark-editor-demo-projects.sh [--apply] [--report PATH]

Default: read-only dry-run. Use --apply to quarantine only the exact known
legacy demo fingerprints. --report writes the JSON classification report.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) APPLY=1 ;;
    --report)
      shift
      [[ $# -gt 0 ]] || { echo "--report requires a path" >&2; exit 2; }
      REPORT_FILE="$1"
      ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

DATA_FILE="$DATA_DIR/projects.json"
if [[ ! -f "$DATA_FILE" ]]; then
  echo "No project data file found: $DATA_FILE" >&2
  exit 1
fi

LOCK_DIR="$DATA_FILE.cleanup.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Cleanup is already running: $LOCK_DIR" >&2
  exit 1
fi
cleanup_lock() { rmdir "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup_lock EXIT

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$DATA_FILE.$STAMP.bak"
QUARANTINE_FILE="$DATA_FILE.$STAMP.quarantine.json"
TMP_FILE="$DATA_FILE.$STAMP.tmp"
REPORT_TMP=""
if [[ -n "$REPORT_FILE" ]]; then
  REPORT_TMP="$REPORT_FILE.$STAMP.tmp"
  mkdir -p "$(dirname "$REPORT_FILE")"
fi

DATA_FILE="$DATA_FILE" BACKUP_FILE="$BACKUP_FILE" QUARANTINE_FILE="$QUARANTINE_FILE" \
TMP_FILE="$TMP_FILE" REPORT_FILE="$REPORT_FILE" REPORT_TMP="$REPORT_TMP" \
APPLY="$APPLY" STAMP="$STAMP" node <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');

const dataFile = process.env.DATA_FILE;
const backupFile = process.env.BACKUP_FILE;
const quarantineFile = process.env.QUARANTINE_FILE;
const tmpFile = process.env.TMP_FILE;
const reportFile = process.env.REPORT_FILE;
const reportTmp = process.env.REPORT_TMP;
const apply = process.env.APPLY === '1';
const stamp = process.env.STAMP;

const sourceBytes = fs.readFileSync(dataFile);
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const records = JSON.parse(sourceBytes.toString('utf8'));
if (!Array.isArray(records)) throw new Error('projects.json must contain an array');

// These fingerprints match only the two local synthetic records previously
// found in the tracked seed. IDs alone are not sufficient: a real project
// with a reused ID must never be quarantined by this utility.
function isKnownDemo(project) {
  if (!project || project.velox_project_id || project.instaedit_project_id) return false;
  if (project.id === 'id-A' && project.name === 'Updated' && project.type === 'custom') {
    return project.canvas_json && project.canvas_json.bar === 2 && project.folder_id === 'folder-1';
  }
  if (project.id === 'id-B' && project.name === 'B' && project.type === 'banner') {
    return project.canvas_json && project.canvas_json.foo === 1 && project.folder_id === null;
  }
  return false;
}

const quarantined = records.filter(isKnownDemo);
const survivors = records.filter((project) => !isKnownDemo(project));
const report = {
  version: 'dark-editor.demo-cleanup.v2',
  mode: apply ? 'apply' : 'dry-run',
  source: dataFile,
  source_sha256: sourceSha256,
  created_at: new Date().toISOString(),
  record_count: records.length,
  quarantined_count: quarantined.length,
  preserved_count: survivors.length,
  quarantined_ids: quarantined.map((project) => project.id ?? null),
  preserved_ids: survivors.map((project) => project.id ?? null),
};

if (apply) {
  // Re-read the source before writing so a concurrent writer cannot make the
  // classification stale after the lock was acquired.
  const verifyBytes = fs.readFileSync(dataFile);
  const verifySha256 = crypto.createHash('sha256').update(verifyBytes).digest('hex');
  if (verifySha256 !== sourceSha256) throw new Error('projects.json changed during classification; refusing apply');

  fs.copyFileSync(dataFile, backupFile);
  const quarantinePayload = {
    ...report,
    backup: backupFile,
    records: quarantined,
  };
  fs.writeFileSync(quarantineFile, JSON.stringify(quarantinePayload, null, 2) + '\n', { mode: 0o600 });
  const nextBytes = Buffer.from(JSON.stringify(survivors, null, 2) + '\n');
  fs.writeFileSync(tmpFile, nextBytes, { mode: 0o600 });
  fs.renameSync(tmpFile, dataFile);
  report.backup = backupFile;
  report.quarantine = quarantineFile;
  report.result_sha256 = crypto.createHash('sha256').update(nextBytes).digest('hex');
} else {
  report.note = 'No files changed. Re-run with --apply only after reviewing this report.';
}

const output = JSON.stringify(report, null, 2) + '\n';
if (reportFile) {
  fs.writeFileSync(reportTmp, output, { mode: 0o600 });
  fs.renameSync(reportTmp, reportFile);
}
process.stdout.write(output);
console.error(`${apply ? 'Applied' : 'Dry-run'}: ${quarantined.length} known demo record(s), ${survivors.length} preserved record(s)`);
NODE
